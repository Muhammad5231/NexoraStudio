import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { getSettings } from "@/lib/content";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { settingsSectionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/settings — full settings (all content here is public business info)
// PUT /api/settings — admin update one section: { section, data }
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const settings = await getSettings();
    return ok({ settings });
  } catch {
    return serverError("settings-get");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, "Invalid request body");
    }

    const parsed = settingsSectionSchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));

    // Only plain-object values are accepted; nothing here is ever rendered as
    // raw HTML on the public site (React text rendering = no XSS vector).
    if (typeof parsed.data.data !== "object" || parsed.data.data === null || Array.isArray(parsed.data.data)) {
      return fail(400, "Invalid settings payload.");
    }

    await db.siteSetting.upsert({
      where: { key: parsed.data.section },
      create: { key: parsed.data.section, value: JSON.stringify(parsed.data.data) },
      update: { value: JSON.stringify(parsed.data.data) },
    });

    const settings = await getSettings();
    return ok({ settings });
  } catch {
    return serverError("settings-put");
  }
}
