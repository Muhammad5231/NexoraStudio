import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { guard, isNextResponse, fail, ok, serverError } from "@/lib/api-helpers";
import { sniffGenericUpload } from "@/lib/file-validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST /api/media-upload — admin image/video upload (local dev strategy).
// Saves to public/uploads with a random name; original filename, declared
// MIME type and content are verified via magic-byte sniffing before anything
// touches disk.
// PRODUCTION NOTE: ephemeral hosts may not persist these files — configure
// a managed provider (e.g. Cloudinary) or paste absolute media URLs instead.
// ---------------------------------------------------------------------------

/** Canonical extensions accepted by this endpoint (sniffed from real bytes). */
const ALLOWED_EXTENSIONS = new Set(["jpg", "png", "webp", "gif", "avif", "mp4", "webm", "mov"]);

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export async function POST(req: NextRequest) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const formData = await req.formData().catch(() => null);
    if (!formData) return fail(400, "Expected multipart form data.");

    const file = formData.get("file");
    if (!(file instanceof File)) return fail(400, "No file provided.");

    if (file.size > MAX_BYTES) {
      return fail(413, "File too large. Maximum size is 12 MB.");
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const sniff = sniffGenericUpload(bytes);
    if (!sniff.ok || !sniff.ext) {
      return fail(415, sniff.reason ?? "Unsupported or invalid file.");
    }
    if (!ALLOWED_EXTENSIONS.has(sniff.ext)) {
      return fail(415, "Unsupported file type. Use JPG, PNG, WebP, GIF, AVIF, MP4, WebM or MOV.");
    }

    const name = `${randomUUID()}.${sniff.ext}`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), bytes);

    return ok({ url: `/uploads/${name}` }, 201);
  } catch {
    return serverError("media-upload");
  }
}
