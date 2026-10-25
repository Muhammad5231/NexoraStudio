import "server-only";
import { randomUUID } from "crypto";
import path from "path";
import { GALLERY_LIMITS, POSTER_LIMIT, type KindLimit } from "./gallery-limits";

// ---------------------------------------------------------------------------
// Server-side media validation for gallery uploads. The client-declared MIME
// type and filename are NEVER trusted — the real content is sniffed via magic
// bytes, and stored names are always server-generated UUIDs (no path
// traversal is possible because no user input reaches the filesystem path).
// ---------------------------------------------------------------------------

export type SniffResult = {
  ok: boolean;
  /** Canonical extension for the detected content ("mp4" | "webm" | "jpg" | "png" | "webp"). */
  ext?: string;
  reason?: string;
};

/** Detect the real file type from magic bytes. */
export function sniffFileType(bytes: Buffer): SniffResult {
  if (bytes.length < 12) return { ok: false, reason: "File is too small to be valid media." };

  // MP4 / MOV family: bytes 4-8 are the brand "ftyp"
  if (bytes.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = bytes.subarray(8, 12).toString("latin1");
    // isom/mp42/avc1... are MP4; "qt  " is QuickTime MOV (not accepted here)
    if (brand.startsWith("qt")) return { ok: false, reason: "MOV is not supported — export MP4 or WebM." };
    return { ok: true, ext: "mp4" };
  }

  // WebM / Matroska: EBML header 0x1A45DFA3
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { ok: true, ext: "webm" };
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ok: true, ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return { ok: true, ext: "png" };
  }

  // WebP: "RIFF" .... "WEBP"
  if (bytes.subarray(0, 4).toString("latin1") === "RIFF" && bytes.subarray(8, 12).toString("latin1") === "WEBP") {
    return { ok: true, ext: "webp" };
  }

  return { ok: false, reason: "Unrecognised file content — not a valid media file." };
}

/** Validate a raw upload against the kind's rules. Returns the canonical extension. */
export function validateUploadContent(bytes: Buffer, limit: KindLimit): { ok: true; ext: string } | { ok: false; status: number; error: string } {
  if (bytes.length === 0) return { ok: false, status: 400, error: "Uploaded file is empty." };
  if (bytes.length > limit.maxBytes) {
    return { ok: false, status: 413, error: `File too large — maximum size is ${limit.maxLabel}.` };
  }
  const sniff = sniffFileType(bytes);
  if (!sniff.ok || !sniff.ext) {
    return { ok: false, status: 415, error: sniff.reason ?? "Unsupported or invalid file." };
  }
  if (!limit.extensions.includes(sniff.ext)) {
    return {
      ok: false,
      status: 415,
      error: `That file is ${sniff.ext.toUpperCase()}, but this slot accepts: ${limit.extensions.join(", ").toUpperCase()}.`,
    };
  }
  return { ok: true, ext: sniff.ext };
}

/* ------------------------------------------------------------------ storage */

const GALLERY_ROOT = path.join(process.cwd(), "public", "uploads", "gallery");

/** Directory for a kind of asset. `poster` uses the photos rule set. */
export function galleryDir(kind: "video" | "photo" | "poster"): string {
  const sub = kind === "video" ? "videos" : kind === "poster" ? "posters" : "photos";
  return path.join(GALLERY_ROOT, sub);
}

export function limitForKind(kind: "video" | "photo" | "poster"): KindLimit {
  if (kind === "video") return GALLERY_LIMITS.video;
  if (kind === "poster") return POSTER_LIMIT;
  return GALLERY_LIMITS.photo;
}

/**
 * Resolve a stored media reference ("/uploads/gallery/…") to an absolute path,
 * guaranteeing it stays inside the gallery storage root. Returns null when the
 * reference is malformed or escapes the root.
 */
export function resolveGalleryPath(ref: string): string | null {
  if (!ref.startsWith("/uploads/gallery/")) return null;
  const clean = path.normalize(ref.replace(/^\/+/, "")); // uploads/gallery/…
  const abs = path.join(process.cwd(), "public", clean);
  const rootWithSep = GALLERY_ROOT + path.sep;
  if (!abs.startsWith(rootWithSep)) return null;
  // basename must be server-generated: uuid.ext / uuid.thumb.webp
  const name = path.basename(abs);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.thumb)?\.(mp4|webm|jpg|jpeg|png|webp)$/i.test(name)) {
    return null;
  }
  return abs;
}

/** Generate the stored filename for an upload (server-side UUID only). */
export function generatedName(ext: string): string {
  return `${randomUUID()}.${ext}`;
}
