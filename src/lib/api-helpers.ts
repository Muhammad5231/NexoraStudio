import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser } from "@/lib/auth";
import type { AdminUser } from "@/lib/types";

// ---------------------------------------------------------------------------
// Shared API helpers: consistent JSON errors, admin guard, CSRF header check.
// ---------------------------------------------------------------------------

export function ok(data: unknown, init?: number) {
  return NextResponse.json(data, { status: init ?? 200 });
}

export function fail(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status });
}

/** Never leak internals to public clients. */
export function serverError(scope: string) {
  console.error(`[api:${scope}]`, new Date().toISOString());
  return fail(500, "Something went wrong on our side. Please try again.");
}

export async function requireAdmin(req: Request): Promise<AdminUser | NextResponse> {
  // lightweight CSRF layer: mutations from the admin UI send this header
  if (req.method !== "GET" && req.headers.get("x-nexora-admin") !== "1") {
    return fail(403, "Forbidden");
  }
  const user = await getSessionUser();
  if (!user) return fail(401, "Your session has expired. Please sign in again.");
  return user;
}

type Guarded = AdminUser | NextResponse;

export async function guard(req: Request): Promise<Guarded> {
  const result = await requireAdmin(req);
  return result;
}

export function zodMessage(err: ZodError): string {
  const first = err.issues[0];
  return first ? `${first.message}` : "Invalid input.";
}

export function isNextResponse(x: unknown): x is NextResponse {
  return x instanceof NextResponse;
}
