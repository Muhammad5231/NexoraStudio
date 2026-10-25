# NEXORA STUDIO — Premium Creative Studio Website + Admin Panel

A complete, production-ready website and business tool for an independent freelance
creative studio: a cinematic public site (portfolio, services, case studies,
conversion-focused contact) plus a real, database-backed admin panel (CMS + CRM).

Everything the owner needs to change day-to-day — brand details, services, prices,
projects, FAQs, testimonials, legal pages, contact details — is editable from the
admin panel at `#/admin`. No code changes required.

---

## 1. What's inside

### Public website (single-page application, hash-routed)

| View | Path | Purpose |
|---|---|---|
| Home | `#/` | Cinematic hero, marquee, studio intro, selected work, web/video service sections, Launch Bundle, process timeline, animated stats, testimonials (empty state until real ones exist), FAQ, final CTA |
| Services | `#/services` | All services grouped by discipline, DB-driven |
| Service detail | `#/services/<slug>` | Value prop, use cases, deliverables, process, starting price, exclusions, FAQs, CTAs |
| Portfolio | `#/work` | Filterable editorial grid (All / Websites / Landing Pages / Video Editing / Featured) |
| Case study | `#/work/<slug>` | Hero media, meta strip, problem/objectives/direction/solution, gallery (images + video), next-project nav |
| About | `#/about` | Owner story, approach, philosophy, skills, tools |
| Contact | `#/contact` | Contact channels + validated 2-step enquiry form with honeypot spam protection |
| Legal | `#/privacy`, `#/terms` | Editable policy templates |
| 404 | any unknown path | Branded not-found view |

### Admin panel (`#/admin`) — separate, code-split bundle

- **Auth** — one-time setup screen on first run, login with rate limiting,
  HTTP-only cookie sessions (JWT, bcrypt password hashing), logout, password change.
- **Dashboard** — real metrics: total/new enquiries, pipeline by status, project
  and service counts, recent leads, quick actions.
- **Leads (CRM)** — searchable, filterable, paginated inbox; per-lead status
  pipeline (New → Contacted → Qualified → Proposal Sent → Won / Lost), private
  notes, follow-up dates, click-to-email/WhatsApp/call actions, delete with confirm.
- **Projects** — full CRUD, drafts vs published, featured flag, ordering, slug
  management, cover image + media gallery (image/video) with upload or URL,
  case-study fields, technologies and feature lists.
- **Services** — full CRUD incl. pricing labels, deliverables, use cases, process,
  exclusions, mini-FAQs, publish state, ordering, web/video/package categories.
- **Testimonials** — CRUD with publish switch (hidden from the public site until
  published — never seed fake reviews).
- **FAQs** — CRUD with publish switch.
- **Settings** — Brand, Contact, Social, SEO, Home (hero copy, marquee, sections,
  process steps, stats, bundle), About (bio, portrait, skills, tools), Footer,
  Pages (privacy/terms/404), Account (password change).

### REST API (`src/app/api/**`)

All responses JSON. Errors are consistent: `{ "error": "message" }`.

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/auth` | public | `{ setupRequired, authenticated, user }` |
| `POST /api/auth` | public | `{ action: "setup" \| "login" \| "logout" \| "password", ... }` |
| `GET /api/content` | public | Full public content snapshot (settings + published content) |
| `POST /api/enquiries` | public | Enquiry submission (Zod-validated, rate-limited, honeypot) |
| `GET /api/stats` | admin | Dashboard metrics |
| `GET /api/enquiries` | admin | Paginated lead list (`?page&pageSize&search&status&service&sort`) |
| `GET/PATCH/DELETE /api/enquiries/:id` | admin | Lead detail / status-notes-followup / delete |
| `GET /api/projects` | public (all=1 → admin) | Projects; drafts only for admins |
| `POST /api/projects`, `GET/PATCH/DELETE /api/projects/:id` | admin | Project CRUD |
| `GET /api/services` (+`?all=1`), `POST`, `GET/PATCH/DELETE /:id` | admin | Service CRUD |
| `GET /api/faqs` (+`?all=1`), `POST`, `PATCH/DELETE /:id` | admin | FAQ CRUD |
| `GET /api/testimonials` (+`?all=1`), `POST`, `PATCH/DELETE /:id` | admin | Testimonial CRUD |
| `GET /api/settings` | public | All site settings |
| `PUT /api/settings` | admin | Update one section `{ section, data }` |
| `POST /api/media-upload` | admin | Local upload (dev strategy, see below) |

Admin mutations require the `x-nexora-admin: 1` header (CSRF layer) plus a valid
session cookie. All input is validated server-side with Zod. No stack traces or
internals are returned to clients.

---

## 2. Tech stack & architecture decisions

- **Next.js 16 (App Router) + TypeScript (strict)** — one deployable app.
- **Hash-routed SPA** — the hosting sandbox exposes a single URL, so every public
  page and the admin panel are views of one application rooted at `/`. This keeps
  deep links (`#/work/slug`, `#/admin/leads`) working with back/forward support.
- **API route handlers instead of a separate Express server** — same REST
  contract, one process, no CORS complexity. The API layer is intentionally
  thin and portable: if you later split out an Express service, the Zod schemas
  (`src/lib/validation.ts`) and content shapes (`src/lib/types.ts`) move as-is.
- **Prisma + SQLite** — the sandbox standard. The schema (`prisma/schema.prisma`)
  is deliberately simple (string JSON columns for list fields, no native array
  types) so migrating to Postgres or a document store later is straightforward.
  For MongoDB specifically, the models map 1:1 (arrays become real arrays).
- **framer-motion** for all interface + scroll motion (coherent single system,
  reduced-motion aware). Heavy 3D/WebGL deliberately avoided for performance.
- **Tailwind CSS 4 + shadcn/ui** — design tokens in `src/app/globals.css`
  (`ink / coal / ivory / volt` palette, Space Grotesk display + Inter body).
- **Auth** — bcryptjs + jose (HS256 JWT in an httpOnly, sameSite=lax cookie).

---

## 3. Local development

```bash
# 1. Install dependencies
bun install            # or npm install

# 2. Configure environment
cp .env.example .env   # then edit AUTH_SECRET + DATABASE_URL

# 3. Create/update the database
bun run db:push        # creates SQLite schema (db/custom.db)

# 4. Start the dev server
bun run dev            # http://localhost:3000

# 5. Lint & typecheck
bun run lint
bunx tsc --noEmit
```

The database seeds itself on first request: default settings, 8 services,
6 sample projects (all clearly labelled **Concept Project**), and FAQs.
**No testimonials are seeded** — the public section shows a tasteful empty state
until the owner adds genuine client feedback.

### First admin login (bootstrap procedure)

1. Open the site → footer → **Admin** (or go directly to `#/admin`).
2. Because no admin exists yet, the **one-time "Create your admin account"**
   screen appears. It disappears forever after the account is created.
3. Choose your name, email and a strong password (min 8 chars, letter + number).
4. You are signed in immediately. Keep these credentials safe — there is no
   public registration and no password recovery email in this build. If you lose
   the password, delete the row from the `AdminUser` table (or the whole DB file
   in dev) and the setup screen returns.

> The initial password is chosen by YOU at runtime — it is never committed to
> source control, and this project ships with zero default credentials.

---

## 4. Day-to-day content editing (no code)

All of this happens in `#/admin`:

- **Brand & copy** — Settings → Brand / Home / Footer (name, tagline, hero
  headline lines, marquee items, intro points, bundle features, process steps, stats).
- **Contact details** — Settings → Contact (email, WhatsApp number in
  international format e.g. `919999999999`, location, hours, response time).
  WhatsApp buttons across the site update automatically.
- **Social links** — Settings → Social (empty fields hide the icons everywhere).
- **Owner story** — Settings → About (name, role, portrait, bio paragraphs
  separated by blank lines, skills, tools, philosophy).
- **Services & prices** — Services section (create, edit, reorder, publish/unpublish).
- **Portfolio** — Projects (create, draft → publish, feature, reorder, upload
  cover images and gallery media, link live sites).
- **Legal pages** — Settings → Pages (plain text; blank line = new paragraph).
- **Leads** — Leads inbox (status, notes, follow-ups).

**Labelling rule:** sample/self-initiated work must keep the **Concept Project**
type until it is replaced with genuine client work. The public site displays this
label prominently — do not fake client projects.

---

## 5. Media

- **URLs first** — every image/video field accepts an absolute URL or a
  site-relative path. This is the recommended production strategy (host media on
  Cloudinary, S3, or your CDN and paste the URL).
- **Local upload (dev)** — `POST /api/media-upload` saves files to
  `public/uploads` (12 MB cap, strict MIME allow-list, randomized filenames so
  client-provided names are never trusted). Ephemeral hosts (e.g. Vercel) do
  **not** persist these files across deploys — use URL-based media or wire a
  managed provider there.
- Project seed images live in `public/media/` (AI-generated placeholder art for
  the Concept Projects — replace freely).

---

## 6. Production deployment

> The public site is one route; the API is part of it. Any Node host works.

**Vercel (or similar):**
1. Push to Git. Import the repo.
2. Set env vars: `DATABASE_URL`, `AUTH_SECRET` (long random string),
   `NEXT_PUBLIC_SITE_URL` (your domain).
3. SQLite on serverless platforms is ephemeral — for production data durability
   either host on a persistent-volume platform (Railway, Render, Fly.io) or point
   Prisma at Postgres by changing `provider` in `prisma/schema.prisma` and
   re-running `bun run db:push`. Content re-seeds automatically on an empty DB.
4. `bun run build` → `bun run start` (standalone output).

**MongoDB Atlas option:** the models in `prisma/schema.prisma` map directly
(list fields become arrays); swap the datasource or port the repositories.
The application layers (`validation.ts`, `types.ts`, API handlers) are storage-agnostic.

**Email notifications (optional):** new leads are always stored in the database.
To also receive an email per lead, configure SMTP env vars (see `.env.example`)
and add a transport call inside `POST /api/enquiries` after `db.enquiry.create`.
No paid service is required for core functionality.

**Checklist before going live:**
- [ ] Strong `AUTH_SECRET` set
- [ ] Real contact details + WhatsApp number in Settings
- [ ] Owner name/bio/portrait in Settings → About
- [ ] Concept Projects replaced or clearly kept as samples
- [ ] Legal pages reviewed (templates, not legal advice)
- [ ] `NEXT_PUBLIC_SITE_URL` set for sitemap/canonicals

---

## 7. Security notes

- Passwords hashed with bcrypt (cost 10); sessions are signed JWTs in httpOnly
  cookies (7-day expiry); `secure` flag on in production.
- Login rate limiting (8 attempts / 15 min / IP), enquiry rate limiting (5/h/IP),
  one-time setup rate limit.
- Zod validation on every mutation; Prisma parameterized queries (no injection).
- CSRF layer: state-changing admin APIs require the `x-nexora-admin` header.
- Honeypot field silently discards bot submissions.
- Notes/lead data are never exposed through public endpoints; drafts only via
  authenticated API. Admin view renders `noindex`.
- No secrets in client code; `.env` is gitignored (keep it that way).

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Login says "Setup is already complete" | An admin exists; use the login form. Lost password → reset via DB (see §3). |
| Stats/dashboard errors after long idle | Session expired (7 days) — sign in again. |
| Uploaded image 404s after deploy | Ephemeral filesystem — use URL-based media (§5). |
| Content changes not visible on the public site | Navigate admin → "View site" (auto-refresh) or reload the tab; server-rendered data refreshes on document load. |
| `db:push` loses data | It's a dev tool; in production use migrations and backups. |
| Rate limited while testing forms | Limits reset hourly; restart the dev server to clear the in-memory buckets. |

## 9. Project structure (key paths)

```
src/
  app/
    page.tsx                  # server root: seeds + hydrates the SPA
    layout.tsx                # fonts, metadata, toaster
    globals.css               # design tokens + utilities
    sitemap.ts                # sitemap.xml
    api/…                     # REST endpoints (see §1)
  components/
    site/                     # public chrome + primitives + views/
    admin/                    # admin app (auth, shell, views, fields)
  lib/
    auth.ts rate-limit.ts validation.ts content.ts seed.ts
    router.tsx api-client.ts types.ts settings-defaults.ts seed-data.ts
prisma/schema.prisma          # AdminUser, SiteSetting, Service, Project,
                              # Testimonial, Faq, Enquiry
public/media                  # generated placeholder art (replaceable)
```
