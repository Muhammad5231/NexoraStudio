import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { serviceSchema } from "@/lib/validation";
import { shapeService } from "@/lib/content";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET / PATCH / DELETE /api/services/:id — admin service CRUD
// ---------------------------------------------------------------------------

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const service = await db.service.findUnique({ where: { id } });
    if (!service) return fail(404, "Service not found.");
    return ok({ service: shapeService(service) });
  } catch {
    return serverError("service-get");
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

    const parsed = serviceSchema.partial().safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const d = parsed.data;

    if (d.slug) {
      const clash = await db.service.findFirst({ where: { slug: d.slug, NOT: { id } } });
      if (clash) return fail(409, "A service with this slug already exists.");
    }

    const data: Record<string, unknown> = {};
    const strFields = ["slug", "title", "category", "summary", "description", "startingPrice", "priceNote"] as const;
    for (const f of strFields) {
      if (d[f] !== undefined) data[f] = d[f];
    }
    if (d.published !== undefined) data.published = d.published;
    if (d.order !== undefined) data.order = d.order;
    if (d.deliverables !== undefined) data.deliverables = JSON.stringify(d.deliverables);
    if (d.useCases !== undefined) data.useCases = JSON.stringify(d.useCases);
    if (d.process !== undefined) data.process = JSON.stringify(d.process);
    if (d.exclusions !== undefined) data.exclusions = JSON.stringify(d.exclusions);
    if (d.faqs !== undefined) data.faqs = JSON.stringify(d.faqs);

    const service = await db.service.update({ where: { id }, data });
    return ok({ service: shapeService(service) });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to update not found")) {
      return fail(404, "Service not found.");
    }
    return serverError("service-patch");
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    await db.service.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to delete does not exist")) {
      return fail(404, "Service not found.");
    }
    return serverError("service-delete");
  }
}
