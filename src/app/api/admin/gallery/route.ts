import { NextRequest, NextResponse } from "next/server";
import { access } from "fs/promises";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { galleryItemSchema } from "@/lib/validation";
import { shapeGalleryItem } from "@/lib/gallery";
import { GALLERY_LIMITS, type GalleryKind } from "@/lib/gallery-limits";
import { resolveGalleryPath } from "@/lib/file-validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET  /api/admin/gallery — all items (drafts included) + usage vs limits
// POST /api/admin/gallery — create; total + published limits enforced inside
//                          a transaction so concurrent requests cannot slip past
// ---------------------------------------------------------------------------

async function fileExists(abs: string | null): Promise<boolean> {
  if (!abs) return false;
  try {
    await access(abs);
    return true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await guard(req);
    if (isNextResponse(user)) return user;
    await ensureSeeded();

    const [items, videoTotal, videoPublished, photoTotal, photoPublished] = await Promise.all([
      db.galleryMedia.findMany({ orderBy: [{ type: "asc" }, { displayOrder: "asc" }, { createdAt: "desc" }] }),
      db.galleryMedia.count({ where: { type: "video" } }),
      db.galleryMedia.count({ where: { type: "video", published: true } }),
      db.galleryMedia.count({ where: { type: "photo" } }),
      db.galleryMedia.count({ where: { type: "photo", published: true } }),
    ]);

    return ok({
      items: items.map(shapeGalleryItem),
      usage: {
        video: { total: videoTotal, published: videoPublished },
        photo: { total: photoTotal, published: photoPublished },
      },
      limits: GALLERY_LIMITS,
    });
  } catch {
    return serverError("admin-gallery-get");
  }
}

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

    const parsed = galleryItemSchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const d = parsed.data;

    // storage references must be server-issued files that actually exist
    if (!(await fileExists(resolveGalleryPath(d.mediaPath)))) {
      return fail(400, "Media file is missing — upload it again.");
    }
    if (d.posterPath && !(await fileExists(resolveGalleryPath(d.posterPath)))) {
      return fail(400, "Poster image is missing — upload it again.");
    }
    if (d.thumbPath && !(await fileExists(resolveGalleryPath(d.thumbPath)))) {
      return fail(400, "Thumbnail is missing — upload the media again.");
    }
    if (d.type === "video" && /\.(jpg|jpeg|png|webp)$/i.test(d.mediaPath)) {
      return fail(400, "A video record needs an MP4 or WebM file.");
    }
    if (d.type === "photo" && /\.(mp4|webm)$/i.test(d.mediaPath)) {
      return fail(400, "A photo record needs a JPG, PNG or WebP file.");
    }

    const created = await db.$transaction(async (tx) => {
      const kind = d.type as GalleryKind;
      const limits = GALLERY_LIMITS[kind];

      const [total, published] = await Promise.all([
        tx.galleryMedia.count({ where: { type: d.type } }),
        tx.galleryMedia.count({ where: { type: d.type, published: true } }),
      ]);
      if (total >= limits.maxTotal) {
        return { limit: "total" as const, row: null };
      }
      if ((d.published ?? false) && published >= limits.maxPublished) {
        return { limit: "published" as const, row: null };
      }

      const maxOrder = await tx.galleryMedia.aggregate({
        where: { type: d.type },
        _max: { displayOrder: true },
      });

      const row = await tx.galleryMedia.create({
        data: {
          type: d.type,
          title: d.title,
          description: d.description ?? "",
          caption: d.caption ?? "",
          category: d.category ?? "",
          mediaPath: d.mediaPath,
          posterPath: d.posterPath ?? "",
          thumbPath: d.thumbPath ?? "",
          altText: d.altText ?? "",
          width: d.width ?? 0,
          height: d.height ?? 0,
          durationSeconds: d.durationSeconds ?? 0,
          clientName: d.clientName ?? "",
          featured: d.featured ?? false,
          published: d.published ?? false,
          displayOrder: d.displayOrder ?? (maxOrder._max.displayOrder ?? -1) + 1,
        },
      });
      return { limit: null, row };
    });

    if (created.limit === "total") {
      const limits = GALLERY_LIMITS[d.type];
      return fail(
        409,
        `${d.type === "video" ? "Video" : "Photo"} gallery is full (${limits.maxTotal}/${limits.maxTotal} items). Delete at least one item before adding another.`
      );
    }
    if (created.limit === "published") {
      const limits = GALLERY_LIMITS[d.type];
      return fail(
        409,
        `Published limit reached (${limits.maxPublished}/${limits.maxPublished}). Unpublish an item first, or save this one as a draft.`
      );
    }

    return ok({ item: shapeGalleryItem(created.row) }, 201);
  } catch {
    return serverError("admin-gallery-post");
  }
}
