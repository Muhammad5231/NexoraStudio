import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { guard } from "@/lib/api-helpers";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { enquirySchema } from "@/lib/validation";
import { fail, ok, serverError, zodMessage } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/enquiries — admin lead list with search, filters, pagination.
// Query: ?page=1&pageSize=10&search=&status=&service=&sort=newest|oldest
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(5, parseInt(url.searchParams.get("pageSize") ?? "10", 10) || 10));
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 120);
    const status = url.searchParams.get("status") ?? "";
    const service = url.searchParams.get("service") ?? "";
    const sort = url.searchParams.get("sort") === "oldest" ? "oldest" : "newest";

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (service) where.serviceType = service;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { business: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      db.enquiry.findMany({
        where,
        orderBy: { createdAt: sort === "oldest" ? "asc" : "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.enquiry.count({ where }),
    ]);

    return ok({ items, total, page, pageSize });
  } catch {
    return serverError("enquiries-get");
  }
}

// ---------------------------------------------------------------------------
// POST /api/enquiries — public project enquiry submission.
// Validated (Zod), rate-limited, honeypot-protected. Responds ok only after
// the record is persisted.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    await ensureSeeded();
    const ip = clientIp(req);

    const rl = rateLimit(`enquiry:${ip}`, 5, 60 * 60 * 1000);
    if (!rl.ok) {
      return fail(
        429,
        `You've sent several enquiries recently. Please try again in about ${Math.ceil(rl.retryAfterSec / 60)} minutes — or reach us directly on WhatsApp.`
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return fail(400, "Invalid request body");
    }

    // Honeypot: hidden field real users never fill. Bots that do are
    // silently told "success" while nothing is stored.
    const honeypot = (body as { website?: unknown })?.website;
    if (typeof honeypot === "string" && honeypot.length > 0) {
      return ok({ success: true });
    }

    const parsed = enquirySchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const data = parsed.data;

    const enquiry = await db.enquiry.create({
      data: {
        name: data.name,
        business: data.business ?? "",
        email: data.email.toLowerCase(),
        phone: data.phone ?? "",
        serviceType: data.serviceType,
        description: data.description,
        budget: data.budget ?? "",
        timeline: data.timeline ?? "",
        contactMethod: data.contactMethod,
        status: "NEW",
        source: "Website",
      },
    });

    return ok({ success: true, id: enquiry.id });
  } catch {
    return serverError("enquiries");
  }
}
