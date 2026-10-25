import { getPublicContent } from "@/lib/content";
import { ok, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// GET /api/content — public content snapshot (used by the SPA to refresh
// after the owner edits content in the admin panel in the same session).
export async function GET() {
  try {
    const data = await getPublicContent();
    return ok(data);
  } catch {
    return serverError("content");
  }
}
