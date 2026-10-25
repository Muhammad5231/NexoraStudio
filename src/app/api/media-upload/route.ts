import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { guard, isNextResponse, fail, ok, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/media-upload — admin image/video upload (local dev strategy).
// Saves to public/uploads with a random name; original filename and
// content-type are never trusted for the stored name.
// PRODUCTION NOTE: ephemeral hosts may not persist these files — configure
// a managed provider (e.g. Cloudinary) or paste absolute media URLs instead.
// ---------------------------------------------------------------------------

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export async function POST(req: NextRequest) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const formData = await req.formData().catch(() => null);
    if (!formData) return fail(400, "Expected multipart form data.");

    const file = formData.get("file");
    if (!(file instanceof File)) return fail(400, "No file provided.");

    const ext = ALLOWED[file.type];
    if (!ext) return fail(415, "Unsupported file type. Use JPG, PNG, WebP, GIF, MP4, WebM or MOV.");

    if (file.size > MAX_BYTES) {
      return fail(413, "File too large. Maximum size is 12 MB.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const name = `${randomUUID()}.${ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);

    return ok({ url: `/uploads/${name}` }, 201);
  } catch {
    return serverError("media-upload");
  }
}
