import { db } from "@/lib/db";
import { DEFAULT_SETTINGS } from "@/lib/settings-defaults";
import { SEED_SERVICES, SEED_PROJECTS, SEED_FAQS } from "@/lib/seed-data";
import { hashPassword } from "@/lib/auth";
import type { Settings } from "@/lib/types";

// ---------------------------------------------------------------------------
// Idempotent first-run seeding. Creates default settings, services, sample
// projects (labelled Concept Project) and FAQs. Runs once; flagged in DB.
//
// Admin accounts are NOT user-creatable: exactly one built-in OWNER account
// is guaranteed below. The login screen never offers account creation, and
// the setup API action was removed — this function is the only source of
// admin credentials. Password changes made via Admin → Settings → Account
// are preserved (the password is only set when the account is created).
// ---------------------------------------------------------------------------

/** The studio's permanent admin identity. */
export const FIXED_ADMIN = {
  email: "nexora@studio.com",
  password: "Vahora@05?",
  name: "Nexora Studio",
  role: "OWNER",
} as const;

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = Promise.all([seedOnce(), ensureFixedAdmin()]).then(() => undefined).catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

/**
 * Guarantee exactly one admin account: the fixed studio owner.
 * - Creates the fixed account when missing (fresh database / new deployment).
 * - Removes any legacy accounts created through the old first-run setup
 *   screen, so the admin panel can only ever be entered with the studio
 *   credentials above.
 */
async function ensureFixedAdmin(): Promise<void> {
  const existing = await db.adminUser.findUnique({ where: { email: FIXED_ADMIN.email } });

  if (!existing) {
    await db.adminUser.create({
      data: {
        email: FIXED_ADMIN.email,
        name: FIXED_ADMIN.name,
        role: FIXED_ADMIN.role,
        passwordHash: await hashPassword(FIXED_ADMIN.password),
      },
    });
  }

  // Prune legacy/self-registered accounts — the fixed account is the only key.
  const others = await db.adminUser.findMany({
    where: { email: { not: FIXED_ADMIN.email } },
    select: { id: true },
  });
  if (others.length > 0) {
    await db.adminUser.deleteMany({ where: { id: { in: others.map((o) => o.id) } } });
  }
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
