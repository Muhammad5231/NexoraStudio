import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { testimonialSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH/DELETE /api/testimonials/:id — admin

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

    const parsed = testimonialSchema.partial().safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));

    const data: Record<string, unknown> = {};
    const strFields = ["name", "role", "company", "quote"] as const;
    for (const f of strFields) {
      if (parsed.data[f] !== undefined) data[f] = parsed.data[f];
    }
    if (parsed.data.rating !== undefined) data.rating = parsed.data.rating;
    if (parsed.data.published !== undefined) data.published = parsed.data.published;
    if (parsed.data.order !== undefined) data.order = parsed.data.order;

    const testimonial = await db.testimonial.update({ where: { id }, data });
    return ok({ testimonial });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to update not found")) {
      return fail(404, "Testimonial not found.");
    }
    return serverError("testimonial-patch");
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    await db.testimonial.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to delete does not exist")) {
      return fail(404, "Testimonial not found.");
    }
    return serverError("testimonial-delete");
  }
}
