import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { guard, isNextResponse, fail, ok, serverError } from "@/lib/api-helpers";
import { validateUploadContent, galleryDir, limitForKind, generatedName } from "@/lib/file-validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/admin/gallery/upload — multipart upload for gallery assets. This
// route is the ONLY writer into public/uploads/gallery/*; the admin gallery
// record endpoints then re-validate the returned references before persisting.
//
//   kind: "video"  → MP4/WebM     ≤ 150 MB → /uploads/gallery/videos/<uuid>.mp4
//   kind: "photo"  → JPG/PNG/WebP ≤ 12 MB  → /uploads/gallery/photos/<uuid>.jpg
//   kind: "poster" → image with the photo rules → /uploads/gallery/posters/…
//
// Security: admin session + CSRF header required (guard), size capped before
// buffering, real content verified by magic bytes (declared MIME/filename are
// never trusted), filenames are server-generated UUIDs so no user input ever
// reaches a filesystem path.
// ---------------------------------------------------------------------------

/** Thumbnail spec for photos (fast-loading preview, keeps originals untouched). */
const THUMB_MAX_WIDTH = 640;
const THUMB_QUALITY = 78;

export async function POST(req: NextRequest) {
  try {
    const user = await guard(req);
    if (isNextResponse(user)) return user;

    const formData = await req.formData().catch(() => null);
    if (!formData) return fail(400, "Expected multipart form data.");

    const rawKind = formData.get("kind");
    const kind = rawKind === "video" || rawKind === "photo" || rawKind === "poster" ? rawKind : null;
    if (!kind) return fail(400, "Unknown upload slot — reload the page and try again.");

    const file = formData.get("file");
    if (!(file instanceof File)) return fail(400, "No file provided.");
    if (file.size === 0) return fail(400, "Uploaded file is empty.");

    // Cheap pre-check from the multipart header before buffering the body; the
    // authoritative byte-length check happens after buffering below.
    const limit = limitForKind(kind);
    if (file.size > limit.maxBytes) {
      return fail(413, `File too large — maximum size is ${limit.maxLabel}.`);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const verdict = validateUploadContent(bytes, limit);
    if (!verdict.ok) {
      return fail(verdict.status, verdict.error);
    }

    const dir = galleryDir(kind);
    await mkdir(dir, { recursive: true });
    const name = generatedName(verdict.ext);
    await writeFile(path.join(dir, name), bytes);

    const url = `/uploads/gallery/${kind === "video" ? "videos" : kind === "poster" ? "posters" : "photos"}/${name}`;

    // Photos get a generated webp thumbnail + pixel dimensions so the public
    // grid can render fast without loading originals. Videos rely on the
    // client-captured poster instead.
    if (kind === "photo") {
      let width = 0;
      let height = 0;
      let thumbPath = "";
      try {
        const meta = await sharp(bytes).metadata();
        width = meta.width ?? 0;
        height = meta.height ?? 0;
        // EXIF orientation 5-8 stores the image rotated — swap dimensions.
        const orientation = meta.orientation ?? 1;
        if (orientation >= 5 && orientation <= 8) {
          [width, height] = [height, width];
        }

        const thumbName = name.replace(/\.[a-z0-9]+$/i, ".thumb.webp");
        const thumb = await sharp(bytes)
          .rotate() // bake EXIF orientation into the thumbnail
          .resize({ width: THUMB_MAX_WIDTH, withoutEnlargement: true })
          .webp({ quality: THUMB_QUALITY })
          .toBuffer();
        await writeFile(path.join(dir, thumbName), thumb);
        thumbPath = `/uploads/gallery/photos/${thumbName}`;
      } catch {
        // A failed thumbnail must not fail the upload — the original is saved.
        width = 0;
        height = 0;
        thumbPath = "";
      }
      return ok({ url, thumbPath, width, height }, 201);
    }

    return ok({ url }, 201);
  } catch {
    return serverError("admin-gallery-upload");
  }
}
