import { NextRequest } from "next/server";
import { ensureSeeded } from "@/lib/seed";
import { getPublicGallery } from "@/lib/gallery";
import { ok, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/gallery — public, published media only (drafts never leave the db).
// Optional ?type=video|photo filter.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const type = new URL(req.url).searchParams.get("type");
    const items = await getPublicGallery(type === "video" || type === "photo" ? type : undefined);
    return ok({ items });
  } catch {
    return serverError("gallery-get");
  }
}
