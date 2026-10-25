import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { enquiryPatchSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/enquiries/:id — lead detail (admin)
// PATCH /api/enquiries/:id — status / notes / follow-up (admin)
// DELETE /api/enquiries/:id — remove lead (admin)
// ---------------------------------------------------------------------------

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const enquiry = await db.enquiry.findUnique({ where: { id } });
    if (!enquiry) return fail(404, "Enquiry not found.");
    return ok({ enquiry });
  } catch {
    return serverError("enquiry-get");
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, "Invalid request body");
    }

    const parsed = enquiryPatchSchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));

    const data: Record<string, unknown> = {};
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;
    if (parsed.data.followUpDate !== undefined) {
      data.followUpDate = parsed.data.followUpDate ? new Date(parsed.data.followUpDate) : null;
    }

    const enquiry = await db.enquiry.update({ where: { id }, data });
    return ok({ enquiry });
  } catch (err) {
    // a lead deleted in another tab should 404, not look like a server fault
    if (err instanceof Error && err.message.includes("Record to update not found")) {
      return fail(404, "Enquiry not found.");
    }
    return serverError("enquiry-patch");
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    await db.enquiry.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to delete does not exist")) {
      return fail(404, "Enquiry not found.");
    }
    return serverError("enquiry-delete");
  }
}
