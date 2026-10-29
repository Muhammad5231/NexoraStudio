import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { projectSchema } from "@/lib/validation";
import { shapeProject } from "@/lib/content";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET  /api/projects — public: published only; admin (session): all
// POST /api/projects — admin create
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    await ensureSeeded();
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const includeDrafts = url.searchParams.get("all") === "1";

    // drafts are only exposed to authenticated admins
    if (includeDrafts) {
      const user = await guard(req);
      if (user instanceof NextResponse) return user;
    }

    const projects = await db.project.findMany({
      where: {
        ...(includeDrafts ? {} : { published: true, showInWork: true }),
        ...(category ? { category } : {}),
      },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    const shaped = projects.map(shapeProject);
    // public payload: drop live URLs the admin chose to hide
    if (includeDrafts) return ok({ projects: shaped });
    return ok({ projects: shaped.map((p) => (p.showLiveUrl ? p : { ...p, liveUrl: "" })) });
  } catch {
    return serverError("projects-get");
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

    const parsed = projectSchema.safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const d = parsed.data;

    const exists = await db.project.findUnique({ where: { slug: d.slug } });
    if (exists) return fail(409, "A project with this slug already exists.");

    const project = await db.project.create({
      data: {
        slug: d.slug,
        title: d.title,
        client: d.client ?? "",
        category: d.category,
        projectType: d.projectType,
        year: d.year ?? "",
        description: d.description ?? "",
        overview: d.overview ?? "",
        problem: d.problem ?? "",
        objectives: JSON.stringify(d.objectives ?? []),
        designDirection: d.designDirection ?? "",
        solution: d.solution ?? "",
        features: JSON.stringify(d.features ?? []),
        technologies: JSON.stringify(d.technologies ?? []),
        coverImage: d.coverImage ?? "",
        media: JSON.stringify(d.media ?? []),
        liveUrl: d.liveUrl ?? "",
        showLiveUrl: d.showLiveUrl ?? true,
        featured: d.featured ?? false,
        published: d.published ?? false,
        showInWork: d.showInWork ?? true,
        order: d.order ?? 99,
      },
    });
    return ok({ project: shapeProject(project) }, 201);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique")) {
      return fail(409, "A project with this slug already exists.");
    }
    return serverError("projects-post");
  }
}
