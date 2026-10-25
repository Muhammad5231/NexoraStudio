import "server-only";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import type { AdminUser } from "@/lib/types";

// ---------------------------------------------------------------------------
// Session auth: bcrypt password hashing + signed JWT in an httpOnly cookie.
// No tokens or credentials are ever stored in localStorage.
// ---------------------------------------------------------------------------

const COOKIE_NAME = "nx_session";
const SESSION_DAYS = 7;

function secretKey(): Uint8Array {
  // AUTH_SECRET must be provided in production (.env). A deterministic dev
  // fallback keeps local development frictionless — README documents this.
  const secret =
    process.env.AUTH_SECRET ||
    "nexora-dev-secret-do-not-use-in-production-0f3a9c";
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(adminId: string): Promise<void> {
  const token = await new SignJWT({ sub: adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser(): Promise<AdminUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secretKey());
    const adminId = payload.sub;
    if (!adminId) return null;

    const admin = await db.adminUser.findUnique({
      where: { id: adminId },
      select: { id: true, name: true, email: true, role: true },
    });
    return admin ?? null;
  } catch {
    return null;
  }
}

export function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(password)) return "Password must contain a letter.";
  if (!/[0-9]/.test(password)) return "Password must contain a number.";
  return null;
}
