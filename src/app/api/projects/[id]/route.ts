import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { guard, isNextResponse, fail, ok, serverError, zodMessage } from "@/lib/api-helpers";
import { projectSchema } from "@/lib/validation";
import { shapeProject } from "@/lib/content";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET / PATCH / DELETE /api/projects/:id — admin project CRUD
// ---------------------------------------------------------------------------

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    const project = await db.project.findUnique({ where: { id } });
    if (!project) return fail(404, "Project not found.");
    return ok({ project: shapeProject(project) });
  } catch {
    return serverError("project-get");
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

    const parsed = projectSchema.partial().safeParse(body);
    if (!parsed.success) return fail(400, zodMessage(parsed.error));
    const d = parsed.data;

    if (d.slug) {
      const clash = await db.project.findFirst({ where: { slug: d.slug, NOT: { id } } });
      if (clash) return fail(409, "A project with this slug already exists.");
    }

    const data: Record<string, unknown> = {};
    const strFields = ["slug", "title", "client", "category", "projectType", "year", "description", "overview", "problem", "designDirection", "solution", "coverImage", "liveUrl"] as const;
    for (const f of strFields) {
      if (d[f] !== undefined) data[f] = d[f];
    }
    const boolFields = ["featured", "published", "showInWork", "showLiveUrl"] as const;
    for (const f of boolFields) {
      if (d[f] !== undefined) data[f] = d[f];
    }
    if (d.order !== undefined) data.order = d.order;
    if (d.objectives !== undefined) data.objectives = JSON.stringify(d.objectives);
    if (d.features !== undefined) data.features = JSON.stringify(d.features);
    if (d.technologies !== undefined) data.technologies = JSON.stringify(d.technologies);
    if (d.media !== undefined) data.media = JSON.stringify(d.media);

    const project = await db.project.update({ where: { id }, data });
    return ok({ project: shapeProject(project) });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to update not found")) {
      return fail(404, "Project not found.");
    }
    return serverError("project-patch");
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  try {
    const user = await guard(req);
    if (user instanceof NextResponse) return user;

    const { id } = await ctx.params;
    await db.project.delete({ where: { id } });
    return ok({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Record to delete does not exist")) {
      return fail(404, "Project not found.");
    }
    return serverError("project-delete");
  }
}
