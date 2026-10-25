import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { guard, isNextResponse, fail, ok, serverError } from "@/lib/api-helpers";
import { limitForKind, galleryDir, validateUploadContent, generatedName } from "@/lib/file-validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/admin/gallery/upload — multipart upload for gallery assets.
// kind: "video" (MP4/WebM ≤150MB) | "photo" (JPEG/PNG/WebP ≤12MB) | "poster".
// The declared MIME type and filename are ignored: the real content is sniffed
// via magic bytes and the stored name is always a server-generated UUID.
// Photos additionally get a generated .thumb.webp for grid rendering.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const written: string[] = [];
  try {
    const user = await guard(req);
    if (isNextResponse(user)) return user;

    const formData = await req.formData().catch(() => null);
    if (!formData) return fail(400, "Expected multipart form data.");

    const file = formData.get("file");
    if (!(file instanceof File)) return fail(400, "No file provided.");

    const kindRaw = String(formData.get("kind") ?? "");
    if (kindRaw !== "video" && kindRaw !== "photo" && kindRaw !== "poster") {
      return fail(400, "Unknown upload kind.");
    }
    const kind = kindRaw as "video" | "photo" | "poster";
    const limit = limitForKind(kind);

    // fast-fail on the declared size before buffering the body
    if (file.size > limit.maxBytes) {
      return fail(413, `File too large — maximum size is ${limit.maxLabel}.`);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const check = validateUploadContent(bytes, limit);
    if (!check.ok) return fail(check.status, check.error);

    const dir = galleryDir(kind);
    await mkdir(dir, { recursive: true });

    const name = generatedName(check.ext);
    await writeFile(path.join(dir, name), bytes);
    written.push(path.join(dir, name));

    if (kind === "photo") {
      // generate a web thumbnail (never upscaled) for grid rendering
      try {
        const image = sharp(bytes, { failOn: "error" });
        const meta = await image.metadata();
        const thumbName = name.replace(/(\.[a-z0-9]+)$/i, ".thumb.webp");
        const thumbBuffer = await sharp(bytes)
          .resize({ width: 1200, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();
        await writeFile(path.join(dir, thumbName), thumbBuffer);
        written.push(path.join(dir, thumbName));

        return ok(
          {
            url: `/uploads/gallery/photos/${name}`,
            thumbPath: `/uploads/gallery/photos/${thumbName}`,
            width: meta.width ?? 0,
            height: meta.height ?? 0,
          },
          201
        );
      } catch {
        // unreadable image data — reject and clean the partial files
        await Promise.allSettled(written.map((f) => unlink(f)));
        return fail(415, "Image could not be processed — the file appears to be corrupt.");
      }
    }

    if (kind === "poster") {
      try {
        const meta = await sharp(bytes, { failOn: "error" }).metadata();
        return ok(
          { url: `/uploads/gallery/posters/${name}`, width: meta.width ?? 0, height: meta.height ?? 0 },
          201
        );
      } catch {
        await Promise.allSettled(written.map((f) => unlink(f)));
        return fail(415, "Poster image could not be processed — the file appears to be corrupt.");
      }
    }

    return ok({ url: `/uploads/gallery/videos/${name}` }, 201);
  } catch (err) {
    // any failure after writing → remove orphaned partial files
    await Promise.allSettled(written.map((f) => unlink(f)));
    if (err instanceof Error && err.message.includes("File too large")) {
      return fail(413, err.message);
    }
    return serverError("admin-gallery-upload");
  }
}
