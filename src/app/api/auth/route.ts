import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { createSession, destroySession, getSessionUser, hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema, setupSchema, passwordChangeSchema } from "@/lib/validation";
import { fail, ok, serverError, zodMessage } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/auth — first-run detection + session check
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const adminCount = await db.adminUser.count();
    const user = await getSessionUser();
    return ok({
      setupRequired: adminCount === 0,
      authenticated: !!user,
      user: user ? { name: user.name, email: user.email, role: user.role } : null,
    });
  } catch {
    return serverError("auth-status");
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth — single endpoint, action-dispatched:
//   { action: "setup" | "login" | "logout" | "password", ... }
// ---------------------------------------------------------------------------

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

    // ---- first-run bootstrap --------------------------------------------
    if (action === "setup") {
      const parsed = setupSchema.safeParse(body);
      if (!parsed.success) return fail(400, zodMessage(parsed.error));

      const strengthError = validatePasswordStrength(parsed.data.password);
      if (strengthError) return fail(400, strengthError);

      const adminCount = await db.adminUser.count();
      if (adminCount > 0) {
        return fail(403, "Setup is already complete. Please sign in.");
      }

      const rl = rateLimit(`setup:${ip}`, 5, 60 * 60 * 1000);
      if (!rl.ok) return fail(429, "Too many attempts. Try again later.");

      const admin = await db.adminUser.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          passwordHash: await hashPassword(parsed.data.password),
          role: "OWNER",
        },
      });
      await createSession(admin.id);
      return ok({ user: { name: admin.name, email: admin.email, role: admin.role } });
    }

    // ---- login ------------------------------------------------------------
    if (action === "login") {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) return fail(400, zodMessage(parsed.error));

      const rl = rateLimit(`login:${ip}`, 8, 15 * 60 * 1000);
      if (!rl.ok) {
        return fail(429, `Too many attempts. Try again in ${Math.ceil(rl.retryAfterSec / 60)} min.`);
      }

      const admin = await db.adminUser.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });
      const valid = admin ? await verifyPassword(parsed.data.password, admin.passwordHash) : false;
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
