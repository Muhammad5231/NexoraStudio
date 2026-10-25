import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { faqSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET  /api/faqs — public (published) or admin (all=true)
// POST /api/faqs — admin create
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const includeDrafts = url.searchParams.get("all") === "1";
    if (includeDrafts) {
      const user = await guard(req);
      if (user instanceof NextResponse) return user;
    }

    const faqs = await db.faq.findMany({
      where: includeDrafts ? {} : { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });
    return ok({ faqs });
  } catch {
    return serverError("faqs-get");
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

    const parsed = faqSchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));

    const faq = await db.faq.create({
      data: {
        question: parsed.data.question,
        answer: parsed.data.answer,
        published: parsed.data.published ?? true,
        order: parsed.data.order ?? 99,
      },
    });
    return ok({ faq }, 201);
  } catch {
    return serverError("faqs-post");
  }
}
