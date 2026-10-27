import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "fs/promises";
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

// Chunked video uploads: reverse proxies / preview gateways often cap request
// body size, so large videos are sent as a series of ≤4 MB chunks that the
// server reassembles. Mirrors the client's CHUNK_SIZE in gallery.tsx.
const CHUNK_SIZE = 4 * 1024 * 1024;
const MAX_CHUNKS = 48; // 48 × 4 MB = 192 MB ≥ the 150 MB video cap
const UPLOAD_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tmpRoot(): string {
  return path.join(process.cwd(), "public", "uploads", "gallery", ".tmp");
}

/** Best-effort removal of abandoned temp uploads (older than 24 h). */
async function purgeStaleTemp(): Promise<void> {
  try {
    const root = tmpRoot();
    const entries = await readdir(root).catch(() => [] as string[]);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    for (const entry of entries) {
      if (!UPLOAD_ID_RE.test(entry)) continue;
      const dir = path.join(root, entry);
      const info = await stat(dir).catch(() => null);
      if (info && info.mtimeMs < cutoff) await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    }
  } catch {
    /* housekeeping must never fail a request */
  }
}

/**
 * Reassembly path for chunked video uploads. Writes every chunk into a
 * session-scoped temp dir (server-generated names only), then concatenates,
 * re-validates total size + magic bytes, and promotes the result into videos/.
 */
async function handleChunkedVideo(formData: FormData): Promise<NextResponse> {
  void purgeStaleTemp();

  const uploadId = String(formData.get("uploadId") ?? "");
  const chunkIndex = Number(formData.get("chunkIndex"));
  const totalChunks = Number(formData.get("totalChunks"));

  if (!UPLOAD_ID_RE.test(uploadId)) return fail(400, "Invalid upload session — please retry the upload.");
  if (!Number.isInteger(chunkIndex) || !Number.isInteger(totalChunks)) return fail(400, "Invalid chunk numbers.");
  if (totalChunks < 1 || totalChunks > MAX_CHUNKS) return fail(400, "Invalid chunk count — please retry the upload.");
  if (chunkIndex < 0 || chunkIndex >= totalChunks) return fail(400, "Chunk out of range — please retry the upload.");

  const chunk = formData.get("file");
  if (!(chunk instanceof File)) return fail(400, "No chunk provided.");
  if (chunk.size === 0) return fail(400, "Uploaded chunk is empty.");
  if (chunk.size > CHUNK_SIZE * 1.5) return fail(413, "Chunk too large.");

  const tmpDir = path.join(tmpRoot(), uploadId);
  await mkdir(tmpDir, { recursive: true });
  const partName = `${String(chunkIndex).padStart(4, "0")}.part`;
  await writeFile(path.join(tmpDir, partName), Buffer.from(await chunk.arrayBuffer()));

  // Intermediate chunks stop here — the client keeps going.
  if (chunkIndex < totalChunks - 1) {
    return ok({ received: chunkIndex, of: totalChunks });
  }

  // Final chunk: verify every part arrived, then assemble.
  const parts = (await readdir(tmpDir)).filter((f) => f.endsWith(".part")).sort();
  if (parts.length !== totalChunks) {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    return fail(409, "Some chunks did not arrive — please retry the upload.");
  }

  const buffers: Buffer[] = [];
  for (const part of parts) {
    buffers.push(await readFile(path.join(tmpDir, part)));
  }
  await rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);

  const limit = limitForKind("video");
  const verdict = validateUploadContent(Buffer.concat(buffers), limit);
  if (!verdict.ok) return fail(verdict.status, verdict.error);

  const dir = galleryDir("video");
  await mkdir(dir, { recursive: true });
  const name = generatedName(verdict.ext);
  await writeFile(path.join(dir, name), Buffer.concat(buffers));
  return ok({ url: `/uploads/gallery/videos/${name}` }, 201);
}

export async function POST(req: NextRequest) {
  try {
    const user = await guard(req);
    if (isNextResponse(user)) return user;

    const formData = await req.formData().catch(() => null);
    if (!formData) return fail(400, "Expected multipart form data.");

    // Chunked video path (uploadId present → part of a multi-request upload)
    if (formData.get("uploadId")) {
      return handleChunkedVideo(formData);
    }

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
