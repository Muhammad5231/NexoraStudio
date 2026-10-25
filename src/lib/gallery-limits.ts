// ---------------------------------------------------------------------------
// Gallery media limits — SINGLE source of truth, imported by both the admin UI
// (to pre-validate + show usage) and the API routes (to enforce server-side).
// Changing numbers here updates the whole system; never hardcode them elsewhere.
// ---------------------------------------------------------------------------

export type GalleryKind = "video" | "photo";

export type KindLimit = {
  /** Maximum records including drafts. */
  maxTotal: number;
  /** Maximum records with published=true. */
  maxPublished: number;
  /** Hard upload cap in bytes, enforced server-side. */
  maxBytes: number;
  /** Human-readable size for UI copy. */
  maxLabel: string;
  /** Allowed file extensions (lowercase, no dot). */
  extensions: readonly string[];
  /** Allowed browser MIME types (pre-filter only — server sniffs real content). */
  mimeTypes: readonly string[];
};

export const GALLERY_LIMITS: Record<GalleryKind, KindLimit> = {
  video: {
    maxTotal: 10,
    maxPublished: 8,
    maxBytes: 150 * 1024 * 1024,
    maxLabel: "150 MB",
    extensions: ["mp4", "webm"],
    mimeTypes: ["video/mp4", "video/webm"],
  },
  photo: {
    maxTotal: 24,
    maxPublished: 18,
    maxBytes: 12 * 1024 * 1024,
    maxLabel: "12 MB",
    extensions: ["jpg", "jpeg", "png", "webp"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
};

/** Poster images for videos follow the photo size rules. */
export const POSTER_LIMIT: KindLimit = {
  ...GALLERY_LIMITS.photo,
};

export function isGalleryKind(value: unknown): value is GalleryKind {
  return value === "video" || value === "photo";
}
