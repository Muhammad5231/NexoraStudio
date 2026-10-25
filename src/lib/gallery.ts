import "server-only";
import { db } from "@/lib/db";
import type { GalleryItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Server-side gallery content layer: shaping, public queries and shared-file
// reference checks used by the API routes.
// ---------------------------------------------------------------------------

type Row = {
  id: string;
  type: string;
  title: string;
  description: string;
  caption: string;
  category: string;
  mediaPath: string;
  posterPath: string;
  thumbPath: string;
  altText: string;
  width: number;
  height: number;
  durationSeconds: number;
  clientName: string;
  featured: boolean;
  published: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export function shapeGalleryItem(row: Row): GalleryItem {
  return {
    id: row.id,
    type: row.type === "video" ? "video" : "photo",
    title: row.title,
    description: row.description,
    caption: row.caption,
    category: row.category,
    mediaPath: row.mediaPath,
    posterPath: row.posterPath,
    thumbPath: row.thumbPath,
    altText: row.altText,
    width: row.width,
    height: row.height,
    durationSeconds: row.durationSeconds,
    clientName: row.clientName,
    featured: row.featured,
    published: row.published,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Published items only — the public site never sees drafts. */
export async function getPublicGallery(type?: "video" | "photo"): Promise<GalleryItem[]> {
  const rows = await db.galleryMedia.findMany({
    where: { published: true, ...(type ? { type } : {}) },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(shapeGalleryItem);
}

/**
 * True when `ref` is still used by a record other than `excludeId`.
 * Checks other gallery rows, project media/cover images and site settings —
 * so a shared asset is never deleted from disk while still referenced.
 */
export async function isMediaReferencedElsewhere(ref: string, excludeId?: string): Promise<boolean> {
  if (!ref) return false;

  const [galleryClash, projects, settings] = await Promise.all([
    db.galleryMedia.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        OR: [{ mediaPath: ref }, { posterPath: ref }, { thumbPath: ref }],
      },
      select: { id: true },
    }),
    db.project.findMany({
      where: {
        OR: [{ coverImage: ref }, { media: { contains: ref } }],
      },
      select: { id: true },
      take: 1,
    }),
    db.siteSetting.findMany({
      where: { value: { contains: ref } },
      select: { key: true },
      take: 1,
    }),
  ]);

  return !!(galleryClash || projects.length > 0 || settings.length > 0);
}
