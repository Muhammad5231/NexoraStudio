import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { access } from "fs/promises";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { galleryItemSchema } from "@/lib/validation";
import { isMediaReferencedElsewhere, shapeGalleryItem } from "@/lib/gallery";
import { GALLERY_LIMITS, type GalleryKind } from "@/lib/gallery-limits";
import { resolveGalleryPath } from "@/lib/file-validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET / PATCH / DELETE /api/admin/gallery/:id
// PATCH enforces the published limit on draft→published transitions and
// garbage-collects replaced files. DELETE only removes files that are not
// referenced by any other record.
// ---------------------------------------------------------------------------

type Ctx = { params: Promise<{ id: string }> };

async function fileExists(abs: string | null): Promise<boolean> {
  if (!abs) return false;
  try {
    await access(abs);
    return true;
  } catch {
    return false;
  }
}

/** Delete a stored file when nothing else references it. Never throws. */
async function gcFile(ref: string | undefined, excludeId: string) {
  if (!ref) return;
  try {
    if (await isMediaReferencedElsewhere(ref, excludeId)) return;
    const abs = resolveGalleryPath(ref);
    if (abs) await unlink(abs);
    // thumbnails share the uuid of the source file — clean the sibling too
    const thumb = abs ? abs.replace(/(\.[a-z0-9]+)$/i, ".thumb.webp") : null;
    if (thumb && thumb !== abs) {
      try {
        await unlink(thumb);
      } catch {
        /* no thumbnail — fine */
      }
    }
  } catch {
    /* best-effort cleanup */
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (isNextResponse(user)) return user;

    const { id } = await ctx.params;
    const item = await db.galleryMedia.findUnique({ where: { id } });
    if (!item) return fail(404, "Gallery item not found.");
    return ok({ item: shapeGalleryItem(item) });
  } catch {
    return serverError("admin-gallery-item-get");
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (isNextResponse(user)) return user;

    const { id } = await ctx.params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, "Invalid request body");
    }

    const parsed = galleryItemSchema.partial().safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const d = parsed.data;

    const existing = await db.galleryMedia.findUnique({ where: { id } });
    if (!existing) return fail(404, "Gallery item not found.");

    if (d.mediaPath !== undefined) {
      if (!(await fileExists(resolveGalleryPath(d.mediaPath)))) {
        return fail(400, "Media file is missing — upload it again.");
      }
    }
    if (d.posterPath !== undefined && d.posterPath) {
      if (!(await fileExists(resolveGalleryPath(d.posterPath)))) {
        return fail(400, "Poster image is missing — upload it again.");
      }
    }

    const nextType = (d.type ?? existing.type) as GalleryKind;
    if (d.mediaPath) {
      const mediaIsVideo = /\.(mp4|webm)$/i.test(d.mediaPath);
      if (nextType === "video" && !mediaIsVideo) return fail(400, "A video record needs an MP4 or WebM file.");
      if (nextType === "photo" && mediaIsVideo) return fail(400, "A photo record needs a JPG, PNG or WebP file.");
    }

    // published limit on draft → published transitions
    const publishingNow = d.published === true && !existing.published;
    if (publishingNow) {
      const limits = GALLERY_LIMITS[nextType];
      const withinLimit = await db.$transaction(async (tx) => {
        const count = await tx.galleryMedia.count({
          where: { type: nextType, published: true, id: { not: id } },
        });
        return count < limits.maxPublished;
      });
      if (!withinLimit) {
        const limits = GALLERY_LIMITS[nextType];
        return fail(
          409,
          `Published limit reached (${limits.maxPublished}/${limits.maxPublished} ${nextType === "video" ? "videos" : "photos"}). Unpublish an item first.`
        );
      }
    }

    const data: Record<string, unknown> = {};
    const strFields = ["title", "description", "caption", "category", "mediaPath", "posterPath", "thumbPath", "altText", "clientName"] as const;
    for (const f of strFields) {
      if (d[f] !== undefined) data[f] = d[f];
    }
    const numFields = ["width", "height", "durationSeconds", "displayOrder"] as const;
    for (const f of numFields) {
      if (d[f] !== undefined) data[f] = d[f];
    }
    const boolFields = ["featured", "published"] as const;
    for (const f of boolFields) {
      if (d[f] !== undefined) data[f] = d[f];
    }
    // type itself is immutable (videos and photos are different admin tabs)
    if (d.type && d.type !== existing.type) {
      return fail(400, "Media type cannot be changed — delete the item and upload it under the correct tab.");
    }

    const updated = await db.galleryMedia.update({ where: { id }, data });

    // garbage-collect replaced assets (only when actually swapped)
    if (d.mediaPath !== undefined && d.mediaPath !== existing.mediaPath) void gcFile(existing.mediaPath, id);
    if (d.posterPath !== undefined && existing.posterPath && d.posterPath !== existing.posterPath) {
      void gcFile(existing.posterPath, id);
    }

    return ok({ item: shapeGalleryItem(updated) });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to update not found")) {
      return fail(404, "Gallery item not found.");
    }
    return serverError("admin-gallery-item-patch");
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (isNextResponse(user)) return user;

    const { id } = await ctx.params;
    const existing = await db.galleryMedia.findUnique({ where: { id } });
    if (!existing) return fail(404, "Gallery item not found.");

    await db.galleryMedia.delete({ where: { id } });

    // remove files from disk only when no other record references them
    void gcFile(existing.mediaPath, id);
    void gcFile(existing.posterPath, id);
    if (existing.thumbPath && existing.thumbPath !== existing.mediaPath) void gcFile(existing.thumbPath, id);

    return ok({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to delete does not exist")) {
      return fail(404, "Gallery item not found.");
    }
    return serverError("admin-gallery-item-delete");
  }
}
