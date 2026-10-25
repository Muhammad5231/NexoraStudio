import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { galleryReorderSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/admin/gallery/reorder — persist a new display order for one kind.
// Unknown/mismatched ids are ignored; only items of the given type are touched.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const user = await guard(req);
    if (isNextResponse(user)) return user;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, "Invalid request body");
    }

    const parsed = galleryReorderSchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const { type, ids } = parsed.data;

    await db.$transaction(
      ids.map((id, index) =>
        db.galleryMedia.updateMany({ where: { id, type }, data: { displayOrder: index } })
      )
    );

    return ok({ success: true });
  } catch {
    return serverError("admin-gallery-reorder");
  }
}
