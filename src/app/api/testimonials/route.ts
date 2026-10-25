import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { testimonialSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET  /api/testimonials — public (published) or admin (all=true)
// POST /api/testimonials — admin create
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeDrafts = url.searchParams.get("all") === "1";
    if (includeDrafts) {
      const user = await guard(req);
      if (user instanceof NextResponse) return user;
    }

    const testimonials = await db.testimonial.findMany({
      where: includeDrafts ? {} : { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return ok({ testimonials });
  } catch {
    return serverError("testimonials-get");
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

    const parsed = testimonialSchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const d = parsed.data;

    const testimonial = await db.testimonial.create({
      data: {
        name: d.name,
        role: d.role ?? "",
        company: d.company ?? "",
        quote: d.quote,
        rating: d.rating ?? 5,
        published: d.published ?? false,
        order: d.order ?? 99,
      },
    });
    return ok({ testimonial }, 201);
  } catch {
    return serverError("testimonials-post");
  }
}
