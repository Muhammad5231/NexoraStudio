import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { serviceSchema } from "@/lib/validation";
import { shapeService } from "@/lib/content";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET  /api/services — public (published) or admin (all=true)
// POST /api/services — admin create
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const url = new URL(req.url);
    const includeDrafts = url.searchParams.get("all") === "1";
    if (includeDrafts) {
      const user = await guard(req);
      if (user instanceof NextResponse) return user;
    }

    const services = await db.service.findMany({
      where: includeDrafts ? {} : { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return ok({ services: services.map(shapeService) });
  } catch {
    return serverError("services-get");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, "Invalid request body");
    }

    const parsed = serviceSchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const d = parsed.data;

    const exists = await db.service.findUnique({ where: { slug: d.slug } });
    if (exists) return fail(409, "A service with this slug already exists.");

    const service = await db.service.create({
      data: {
        slug: d.slug,
        title: d.title,
        category: d.category,
        summary: d.summary ?? "",
        description: d.description ?? "",
        deliverables: JSON.stringify(d.deliverables ?? []),
        useCases: JSON.stringify(d.useCases ?? []),
        process: JSON.stringify(d.process ?? []),
        exclusions: JSON.stringify(d.exclusions ?? []),
        faqs: JSON.stringify(d.faqs ?? []),
        startingPrice: d.startingPrice ?? "",
        priceNote: d.priceNote ?? "",
        published: d.published ?? false,
        order: d.order ?? 99,
      },
    });
    return ok({ service: shapeService(service) }, 201);
  } catch {
    return serverError("services-post");
  }
}
