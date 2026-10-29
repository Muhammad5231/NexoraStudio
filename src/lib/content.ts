import "server-only";
import { db } from "@/lib/db";
import { ensureSeeded } from "@/lib/seed";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { getPublicGallery } from "@/lib/gallery";
import type {
  Faq,
  Project,
  ProjectMedia,
  Service,
  ServiceFaq,
  Settings,
  SiteData,
  Testimonial,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Server-side content layer. Parses JSON-stringified array fields and merges
// settings with defaults so a missing key never breaks the site.
// ---------------------------------------------------------------------------

function parseArr<T>(json: string | null | undefined, fallback: T[] = []): T[] {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export async function getSettings(): Promise<Settings> {
  await ensureSeeded();
  const rows = await db.siteSetting.findMany();
  const stored: Record<string, unknown> = {};
  for (const row of rows) {
    try {
      stored[row.key] = JSON.parse(row.value);
    } catch {
      // ignore malformed rows, fall back to defaults
    }
  }

  const merged = {} as Settings;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const base = DEFAULT_SETTINGS[key] as Record<string, unknown>;
    const storedSection = (stored[key] ?? {}) as Record<string, unknown>;
    (merged[key] as unknown) = { ...base, ...storedSection };
  }
  return merged;
}

export function shapeService(row: {
  id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  deliverables: string;
  useCases: string;
  process: string;
  exclusions: string;
  faqs: string;
  startingPrice: string;
  priceNote: string;
  published: boolean;
  order: number;
}): Service {
  return {
    ...row,
    deliverables: parseArr<string>(row.deliverables),
    useCases: parseArr<string>(row.useCases),
    process: parseArr<string>(row.process),
    exclusions: parseArr<string>(row.exclusions),
    faqs: parseArr<ServiceFaq>(row.faqs),
  };
}

export function shapeProject(row: {
  id: string;
  slug: string;
  title: string;
  client: string;
  category: string;
  projectType: string;
  year: string;
  description: string;
  overview: string;
  problem: string;
  objectives: string;
  designDirection: string;
  solution: string;
  features: string;
  technologies: string;
  coverImage: string;
  media: string;
  liveUrl: string;
  showLiveUrl: boolean;
  featured: boolean;
  published: boolean;
  showInWork: boolean;
  order: number;
}): Project {
  return {
    ...row,
    objectives: parseArr<string>(row.objectives),
    features: parseArr<string>(row.features),
    technologies: parseArr<string>(row.technologies),
    media: parseArr<ProjectMedia>(row.media),
  };
}

export async function getPublicContent(): Promise<SiteData> {
  await ensureSeeded();

  const [settings, projects, services, faqs, testimonials, gallery] = await Promise.all([
    getSettings(),
    // public Work grid shows website-related projects only; video-only work
    // lives in the Gallery (showInWork stays reversible from the admin)
    db.project.findMany({
      where: { published: true, showInWork: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
    db.service.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    db.faq.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    db.testimonial.findMany({
      where: { published: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    }),
    getPublicGallery(),
  ]);

  return {
    settings,
    // Admin can keep a live URL on file but hide it from the public site —
    // the URL itself is stripped from the public payload (not just the UI).
    projects: projects.map((p) => {
      const shaped = shapeProject(p);
      return shaped.showLiveUrl ? shaped : { ...shaped, liveUrl: "" };
    }),
    services: services.map(shapeService),
    faqs: faqs.map((f) => ({
      id: f.id,
      question: f.question,
      answer: f.answer,
      published: f.published,
      order: f.order,
    })),
    testimonials: testimonials.map((t) => ({
      id: t.id,
      name: t.name,
      role: t.role,
      company: t.company,
      quote: t.quote,
      rating: t.rating,
      published: t.published,
      order: t.order,
    })),
    gallery,
  };
}

export type { Testimonial };
