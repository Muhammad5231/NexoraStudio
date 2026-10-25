import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { guard, isNextResponse, ok, serverError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/stats — admin dashboard metrics, computed from real stored data
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;
    await ensureSeeded();

    const [total, statusGroups, projectGroups, serviceTotal, servicePublished, testimonialTotal, testimonialPublished, faqTotal, faqPublished, recentLeads] =
      await Promise.all([
        db.enquiry.count(),
        db.enquiry.groupBy({ by: ["status"], _count: { _all: true } }),
        db.project.groupBy({ by: ["published", "featured"], _count: { _all: true } }),
        db.service.count(),
        db.service.count({ where: { published: true } }),
        db.testimonial.count(),
        db.testimonial.count({ where: { published: true } }),
        db.faq.count(),
        db.faq.count({ where: { published: true } }),
        db.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
      ]);

    const byStatus: Record<string, number> = {};
    for (const row of statusGroups) byStatus[row.status] = row._count._all;

    let published = 0;
    let draft = 0;
    let featured = 0;
    for (const row of projectGroups) {
      if (row.published) published += row._count._all;
      else draft += row._count._all;
      if (row.featured) featured += row._count._all;
    }

    return ok({
      stats: {
        enquiries: {
          total,
          newCount: byStatus["NEW"] ?? 0,
          byStatus,
        },
        projects: { total: published + draft, published, draft, featured },
        services: { total: serviceTotal, published: servicePublished },
        testimonials: { total: testimonialTotal, published: testimonialPublished },
        faqs: { total: faqTotal, published: faqPublished },
        recentLeads,
      },
    });
  } catch {
    return serverError("stats");
  }
}
