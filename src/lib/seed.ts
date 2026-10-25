import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { SEED_SERVICES, SEED_PROJECTS, SEED_FAQS } from "@/lib/seed-data";
import type { Settings } from "@/lib/types";

// ---------------------------------------------------------------------------
// Idempotent first-run seeding. Creates default settings, services, sample
// projects (labelled Concept Project) and FAQs. Runs once; flagged in DB.
// ---------------------------------------------------------------------------

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = seedOnce().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function seedOnce(): Promise<void> {
  const flag = await db.siteSetting.findUnique({ where: { key: "seeded" } });
  if (flag) return;

  // Settings — write any missing section
  const sections = Object.keys(DEFAULT_SETTINGS);
  for (const section of sections) {
    const existing = await db.siteSetting.findUnique({ where: { key: section } });
    if (!existing) {
      await db.siteSetting.create({
        data: { key: section, value: JSON.stringify(DEFAULT_SETTINGS[section as keyof Settings]) },
      });
    }
  }

  // Services
  const serviceCount = await db.service.count();
  if (serviceCount === 0) {
    let i = 0;
    for (const s of SEED_SERVICES) {
      await db.service.create({
        data: {
          slug: s.slug,
          title: s.title,
          category: s.category,
          summary: s.summary,
          description: s.description,
          deliverables: JSON.stringify(s.deliverables),
          useCases: JSON.stringify(s.useCases),
          process: JSON.stringify(s.process),
          exclusions: JSON.stringify(s.exclusions),
          faqs: JSON.stringify(s.faqs),
          startingPrice: s.startingPrice,
          priceNote: s.priceNote,
          published: true,
          order: ++i,
        },
      });
    }
  }

  // Projects (all labelled Concept Project, published for demo)
  const projectCount = await db.project.count();
  if (projectCount === 0) {
    for (const p of SEED_PROJECTS) {
      await db.project.create({
        data: {
          ...p,
          objectives: JSON.stringify(p.objectives),
          features: JSON.stringify(p.features),
          technologies: JSON.stringify(p.technologies),
          media: JSON.stringify(p.media),
        },
      });
    }
  }

  // FAQs
  const faqCount = await db.faq.count();
  if (faqCount === 0) {
    let i = 0;
    for (const f of SEED_FAQS) {
      await db.faq.create({
        data: { question: f.question, answer: f.answer, published: true, order: ++i },
      });
    }
  }

  // NOTE: no testimonials are seeded — the public section shows a tasteful
  // empty state until the owner adds genuine client feedback.

  await db.siteSetting.create({ data: { key: "seeded", value: JSON.stringify(true) } });
}
