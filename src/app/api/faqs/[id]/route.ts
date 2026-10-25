import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { faqSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// PATCH/DELETE /api/faqs/:id — admin

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

    const parsed = faqSchema.partial().safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));

    const data: Record<string, unknown> = {};
    if (parsed.data.question !== undefined) data.question = parsed.data.question;
    if (parsed.data.answer !== undefined) data.answer = parsed.data.answer;
    if (parsed.data.published !== undefined) data.published = parsed.data.published;
    if (parsed.data.order !== undefined) data.order = parsed.data.order;

    const faq = await db.faq.update({ where: { id }, data });
    return ok({ faq });
  } catch {
    return serverError("faq-patch");
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    await db.faq.delete({ where: { id } });
    return ok({ success: true });
  } catch {
    return serverError("faq-delete");
  }
}
