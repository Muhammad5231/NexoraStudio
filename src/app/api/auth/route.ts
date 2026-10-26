import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { createSession, destroySession, getSessionUser, hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema, passwordChangeSchema } from "@/lib/validation";
import { fail, ok, serverError, zodMessage } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Admin authentication. There is NO account-creation endpoint by design:
// exactly one studio admin account is provisioned at startup (see
// src/lib/seed.ts → ensureFixedAdmin). This API only supports:
//   GET  — session check
//   POST — { action: "login" | "logout" | "password" }
// ---------------------------------------------------------------------------

/** Dummy hash so "unknown email" and "wrong password" take the same time. */
const DECOY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8DGjOtYtT9GLz9sR5Nb6mRxY1fNJBW";

export async function GET() {
  try {
    await ensureSeeded();
    const user = await getSessionUser();
    return ok({
      authenticated: !!user,
      user: user ? { name: user.name, email: user.email, role: user.role } : null,
    });
  } catch {
    return serverError("auth-status");
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const ip = clientIp(req);
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, "Invalid request body");
    }

    const action = (body as { action?: string })?.action;

    // ---- login ------------------------------------------------------------
    if (action === "login") {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return fail(400, zodMessage(parsed.error));

      const email = parsed.data.email.toLowerCase();

      // Two buckets: per-IP stops volume attacks, per-email stops targeted
      // guessing from rotating addresses.
      const rlIp = rateLimit(`login:${ip}`, 8, 15 * 60 * 1000);
      const rlEmail = rateLimit(`login-email:${email}`, 10, 15 * 60 * 1000);
      const blocked = !rlIp.ok ? rlIp : !rlEmail.ok ? rlEmail : null;
      if (blocked) {
        return fail(429, `Too many attempts. Try again in ${Math.ceil(blocked.retryAfterSec / 60)} min.`);
      }

      const admin = await db.adminUser.findUnique({
        where: { email },
      });
      // Always run a bcrypt compare, even for unknown emails, so response
      // timing cannot reveal which addresses are valid.
      const valid = admin
        ? await verifyPassword(parsed.data.password, admin.passwordHash)
        : await verifyPassword(parsed.data.password, DECOY_HASH);
      if (!admin || !valid) {
        return fail(401, "Incorrect email or password.");
      }

      await createSession(admin.id);
      return ok({ user: { name: admin.name, email: admin.email, role: admin.role } });
    }

    // ---- logout -----------------------------------------------------------
    if (action === "logout") {
      await destroySession();
      return ok({ success: true });
    }

    // ---- change password (authenticated) ----------------------------------
    if (action === "password") {
      const user = await getSessionUser();
      if (!user) return fail(401, "Sign in first.");
      const parsed = passwordChangeSchema.safeParse(body);
      if (!parsed.success) return fail(400, zodMessage(parsed.error));

      const strengthError = validatePasswordStrength(parsed.data.newPassword);
      if (strengthError) return fail(400, strengthError);

      const rl = rateLimit(`password:${user.id}`, 5, 60 * 60 * 1000);
      if (!rl.ok) return fail(429, "Too many attempts. Try again later.");

      const admin = await db.adminUser.findUnique({ where: { id: user.id } });
      if (!admin) return fail(401, "Account not found.");
      const valid = await verifyPassword(parsed.data.currentPassword, admin.passwordHash);
      if (!valid) return fail(400, "Current password is incorrect.");

      await db.adminUser.update({
        where: { id: admin.id },
        data: { passwordHash: await hashPassword(parsed.data.newPassword) },
      });
      return ok({ success: true });
    }

    return fail(400, "Unknown action");
  } catch (err) {
    if (err instanceof z.ZodError) return fail(400, zodMessage(err));
    return serverError("auth");
  }
}
