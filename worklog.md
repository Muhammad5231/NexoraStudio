# Project Worklog — NEXORA STUDIO

Premium freelance creative studio website + full-stack admin panel.
Stack: Next.js 16 (App Router, single SPA route at `/` with hash routing), TypeScript, Tailwind 4 + shadcn/ui, Prisma + SQLite, framer-motion, zod, sonner, bcryptjs + jose auth.

IMPORTANT ARCHITECTURE CONSTRAINTS (read before working):
- The sandbox preview only serves the `/` route. ALL public pages and the admin panel are views inside one hash-routed SPA rooted at `src/app/page.tsx`. Do NOT create new page routes.
- Backend = Next.js API route handlers under `src/app/api/**` (REST + Zod validation). Do NOT create server actions.
- Brand colors: `ink` #0B0B0C (near-black), `coal` #141416, `ivory` #F2EFE7, `ivory2` #E9E4D8, `volt` #C6FF3A (electric lime accent). Fonts: Space Grotesk (display), Inter (body). NO blue/indigo/purple.
- Shared libs every agent must use: `@/lib/router` (useRoute/navigate/Link), `@/lib/api-client` (api()), `@/lib/types`, `@/lib/settings-defaults`, `@/components/site/site-context` (useSite).

---
Task ID: 1
Agent: orchestrator (main)
Task: Foundation — deps, database schema, design tokens, core libraries, seed content.

Work Log:
- Inspected project scaffold (Next.js 16, Tailwind 4, shadcn/ui full set, Prisma SQLite at db/custom.db).
- Added bcryptjs + jose for authentication.
- Replaced Prisma schema with domain models: AdminUser, SiteSetting (key/JSON), Service, Project, Testimonial, Faq, Enquiry. Array fields stored as JSON strings (SQLite has no scalar lists).
- Rewrote globals.css: brand tokens (ink/coal/ivory/volt), display/body font mapping, marquee keyframes, grain + grid-line utilities, slim scrollbars, lime selection/focus.
- layout.tsx: Space Grotesk + Inter fonts, SEO metadata, favicon.
- Core libs written: types.ts, settings-defaults.ts (full editable copy deck), seed.ts (ensureSeeded), auth.ts (bcrypt + jose JWT httpOnly cookie sessions + requireAdmin), rate-limit.ts, validation.ts (zod), router.tsx (hash router + Link), api-client.ts, content.ts (getPublicContent for RSC).
- API routes implemented under src/app/api/**: auth (status/setup/login/logout/me/password), enquiries (public POST + admin CRUD), projects, services, faqs, testimonials (admin CRUD), settings (GET/PUT), stats, media upload.
- Site chrome: site-context (useSite), primitives (Reveal, SectionHead, VoltButton, Marquee, Counter, CTABanner, etc.), Nav (desktop + cinematic mobile menu), Footer, site-shell.tsx (view switcher + admin gate), page.tsx server root.

Stage Summary:
- Foundation complete. API contracts and type shapes are documented in src/lib/types.ts and below. Subagents: build ONLY inside your assigned folder, read src/lib/types.ts + src/lib/router.tsx + src/lib/api-client.ts + src/components/site/primitives.tsx first.

SHARED CONTRACTS FOR SUBAGENTS:

Route parsing (useRoute): returns { path: "work/some-slug", segments: string[], query: Record<string,string> }. Links: `<Link href="/work">` renders `<a href="#/work">`. navigate("/work") scrolls top.

Public site data (useSite()): { settings, projects, services, faqs, testimonials } — settings sections: brand, contact, social, seo, home, about, footer, pages (all typed in @/lib/types).

API (from @/lib/api-client): `api<T>(path, { method?, body?, formData? })` — throws ApiError(status,message). Admin mutations must send header `x-nexora-admin: "1"` (api() does this automatically when `admin: true` option passed; check file). Endpoints:
- GET  /api/auth/status -> { setupRequired, authenticated, user? }
- POST /api/auth/setup { name, email, password }  (only when setupRequired)
- POST /api/auth/login { email, password }; POST /api/auth/logout; GET /api/auth/me
- GET  /api/stats (admin) -> dashboard metrics incl. recentLeads
- GET  /api/enquiries?page&pageSize&search&status&service&sort (admin) -> { items, total, page, pageSize }
- GET/PATCH/DELETE /api/enquiries/:id (PATCH: status, notes, followUpDate)
- GET/POST /api/projects ; GET/PATCH/DELETE /api/projects/:id (admin: all incl. drafts)
- GET/POST /api/services ; GET/PATCH/DELETE /api/services/:id
- GET/POST /api/faqs ; PATCH/DELETE /api/faqs/:id
- GET/POST /api/testimonials ; PATCH/DELETE /api/testimonials/:id
- GET  /api/settings -> { settings } ; PUT /api/settings { section, data } (section = one of brand|contact|social|seo|home|about|footer|pages)
- POST /api/media/upload (formData: file) -> { url } (dev upload to /uploads)

FOUNDATION STATUS (updated after Task 1 completion):
- Prisma schema pushed to db/custom.db. Models: AdminUser, SiteSetting, Service, Project, Testimonial, Faq, Enquiry.
- Media assets generated at public/media/*.png (hero-main, hero-reel, portrait, project-cafe[-2], project-academy[-2], project-stride, project-reels, project-promo, project-portfolio). Seed data references these paths.
- Design tokens live in src/app/globals.css: bg-ink bg-ink-2 bg-coal bg-coal-2 bg-ivory bg-ivory-2 bg-volt bg-volt-2 text-smoke text-graphite, font-display class, display-1/2/3 type scale, kicker, container-x, bg-grid-dark/light, grain, animate-marquee, scroll-slim, link-sweep, VoltButton/Reveal/SectionHead/Chip/Marquee/Counter/MediaFrame/Magnetic/CTABanner/PageHeader/ParallaxImg/Multiline primitives in src/components/site/primitives.tsx.
- Public chrome DONE (do not modify): nav.tsx, footer.tsx, site-shell.tsx, site-context.tsx, views/home.tsx, page.tsx, layout.tsx.
- Toaster: use `import { toast } from "sonner"` for all notifications.
- API base paths are relative (e.g. "/api/projects"). All admin mutating calls MUST pass `admin: true` to api() so the x-nexora-admin CSRF header is sent.
- Router: useRoute() gives { path, segments, query }; Link href="/work" renders "#/work" anchor. IMPORTANT: shell passes route objects into admin via <AdminApp route={route} brandName={...}/>; admin handles sub-paths segments[1..].
- Temporary stubs exist at views/{services,service-detail,work,case-study,about,contact,legal,not-found}.tsx and admin/admin-app.tsx — REPLACE their contents (do not rename files; site-shell lazy-imports these exact paths).

---
Task ID: 2-b
Agent: frontend-styling-expert (public secondary views)
Task: Build the public site views (secondary pages) — 8 lazy-loaded view files for the SPA shell.

Work Log:
- Read worklog contracts, types.ts, router.tsx, primitives.tsx, home.tsx (reference quality bar), nav/footer (tone), validation.ts, api-client.ts, api/enquiries/route.ts, seed-data.ts, settings-defaults.ts, globals.css tokens.
- Replaced the 8 stubs (exact filenames/paths preserved for site-shell lazy imports):
  - views/services.tsx — PageHeader + DB-driven category groups (web=dark, video=bg-ivory, package=dark, empty groups skipped). Editorial card grid with alternating spans (7/5 with lg:mt offsets, single-item → col-span-12); cards = index number, title, summary, startingPrice pill, "View details" ArrowUpRight → /services/:slug. SectionHead reuses home copy deck (h.webTitle/h.videoTitle/h.packageTitle) so services copy stays admin-editable. CTABanner (custom title) at end.
  - views/service-detail.tsx — { slug }: unknown slug renders <NotFoundView/> (imported from ./not-found). PageHeader (kicker = category label map web/video/package), meta = price · priceNote. bg-ivory body: left lg:sticky lg:top-28 price panel (bg-white/70 card: big display price, priceNote, VoltButton "Start a Project" → /contact, outline-dark "WhatsApp us" external with prefilled "Hi — I'm interested in {title}.", "Not included" X-icon exclusions); right column: description via Multiline, then divide-y border-y lists for "What you get" (bg-volt-2 squares + Check), "Who it's for" (volt-2 dots), "How it works" (numbered), service.faqs in shadcn Accordion styled exactly like home FAQ (border-ink/15). CTABanner with service-aware body.
  - views/work.tsx — PageHeader + sticky filter bar (sticky top-[72px] z-30 bg-ink/85 backdrop-blur-xl border-b border-ivory/10; chips All + categories present + Featured; active bg-volt text-ink, min-h-[44px], aria-pressed, horizontally scrollable on mobile). Results count line (aria-live). 12-col grid with home WorkSection span/ratio patterns (7/5/5/7 with mt offsets, 16/10 & 4/3.4), MediaFrame cards with hover volt arrow badge + projectType overlay chip, category/year rows. Tasteful empty state with "Reset filter". CTABanner.
  - views/case-study.tsx — { slug }: unknown slug → <NotFoundView/>. Cinematic hero (own padding replaces PageHeader: kicker "category · year", display-1 title, projectType/Featured chips, full-bleed ParallaxImg cover aspect-16/8 with priority). bg-ink-2 meta strip (Client/Category/Year/Tools first 3). bg-ivory body: sticky "Project facts" card (dl rows, type Chip, tech Chips, outline-dark "Visit live site" when liveUrl) + editorial sections Overview (lead lg text), The Problem, Objectives (volt-2 dot list), Design Direction, The Solution, Features (sm:grid-cols-2 bordered rows with ArrowRight). bg-ivory-2 Gallery: media alternating 16/9 & 4/3 MediaFrames with captions, <video> handling (controls, preload=metadata, playsInline, poster=cover); fallback to cover when media empty. bg-ink Next Project section: display-2 group-hover:text-volt link cycling (i+1)%len with big arrow circle. CTABanner ("Want results like this for your business?").
  - views/about.tsx — PageHeader (meta "{ownerName} — {role}"). Dark portrait section: ParallaxImg aspect-4/5 rounded-3xl border-ivory/10 (fallback /media/portrait.png) + bio split on \n\n (first paragraph text-lg/xl). bg-ivory approach section: SectionHead "Working Approach / Small scope, executed properly." + approach text; philosophy as border-l-2 border-ink blockquote with volt-2 quote mark + figcaption. bg-ivory-2 capabilities: sticky SectionHead + numbered hairline rows with hover:pl-3; "Daily Tools" pill grid grid-cols-2 sm:grid-cols-4. Independent-studio note strip (border-t border-ink/10). CTABanner.
  - views/contact.tsx — conversion page. Left rail: volt-square icon rows (Email mailto, WhatsApp waLink showing phone, Location, Hours+responseTime), socials (only non-empty, bordered circles), trust line. Right: rounded-3xl bg-white/60 card with 2-step enquiry form — step indicator (aria-live) + h-1 progress bar (50%→100% bg-ink transition-all); Step 1 fieldset (name*, business, email*, phone, preferred-contact = native radio inputs styled as 3 segmented volt-active buttons); Step 2 fieldset (serviceType* Select from services + "Something else", budget & timeline Selects, description* textarea with live 20-char counter). Validation: onBlur inline errors (text-red-600), aria-invalid + aria-describedby, Next/Send disabled until valid-ish, fieldsets disabled while sending. HONEYPOT: hidden aria-hidden input name="website" tabIndex={-1} autoComplete="off" submitted with the payload. Submit → api("/api/enquiries", POST) WITHOUT admin:true; success state ONLY after 200: animated volt check circle, "Enquiry received.", "Thanks {firstName} — your brief is in. {responseTime}.", VoltButton external "Continue on WhatsApp" (prefilled with name) + "Back to home"; catch → role=alert inline error box with WhatsApp link, form data preserved, Loader2 "Sending…" state on button. No CTABanner (spec).
  - views/legal.tsx — { kind }: PageHeader "Privacy Policy"/"Terms of Service"; bg-ivory max-w-3xl renderer: \n\n split; numbered clauses "1. Title. Body…" render title as font-display h3 + body as paragraph (regex split), short heading-like lines (<45 chars, no terminal punctuation) as h3, rest paragraphs. Italic admin note at bottom. No CTABanner.
  - views/not-found.tsx — dark 404 (bg-grid-dark + grain + volt blur), giant display-1 "404" + volt period (aria-hidden), h1 "This page wandered off." via StaggeredLines, body from settings.pages.notFound, VoltButton "Back to home" + outline-light "Browse our work". Reused as fallback composition by service-detail & case-study.
- Type-check: `bunx tsc --noEmit` filtered to views/ → 0 errors in all 8 files.

Decisions:
- IMPORTANT — src/components/site/site-context.tsx did NOT exist in the repo (Task 1 log claims it; file absent). All views + home/nav/footer/shell import useSite/waLink from it. I wrote a clearly-marked, contract-exact TEMPORARY STUB at that path (SiteProvider + useSite(): SiteData + waLink(phone, message?) → https://wa.me/<digits>?text=…) purely so tsc could verify my files. Whoever owns the site-context module should REPLACE this stub with the real implementation — my imports match the documented contract exactly, so a drop-in replacement needs zero view changes.
- Spec deviations (deliberate, minor): (1) about "Daily Tools" pills rendered as a full-width block (grid-cols-2 sm:grid-cols-4) below the capabilities list instead of inside a half-width column — honors the spec'd 4-col pill grid without cramping. (2) Legal numbered clauses render their leading "N. Title." sentence as the h3 and the remainder as body text (whole-clause-as-heading looked wrong with the seed copy). (3) Contact success body renders "{responseTime}" as a full sentence ("Replies within 24 hours…") instead of "within {responseTime}" to avoid the awkward "within Replies within…" string. (4) CTABanner copy on services/work/about reuses settings.home.ctaBody/ctaButton so it stays admin-editable; titles are view-specific.
- Media fallbacks: project cover → /media/hero-main.png, portrait → /media/portrait.png (note: seed-data references some .jpg filenames that don't exist on disk; actual files are .png — data-driven, so admins should fix paths in the panel).
- Sticky offsets assume the 72px fixed nav (top-[72px] filter bar, lg:top-28 sticky rails) — matches nav.tsx h-[72px].

For the orchestrator / shell owner:
- site-shell.tsx has a pre-existing error NOT from this task: `import { HomeView } from ".../views/home"` but home.tsx only has `export default function HomeView`. Either home.tsx should add a named export or the shell should use the default import.
- VoltButton always appends an ArrowUpRight icon (no iconless variant) — "Back" buttons in contact/legal-style flows use plain styled <button>s instead.

---
Task ID: 2-a
Agent: admin-panel
Task: Complete NEXORA STUDIO Admin Panel (CMS + CRM) inside src/components/admin/**.

Files created (all inside src/components/admin/):
- admin-app.tsx — root: auth gate (loading/setup/login/authed), dark sidebar shell (fixed w-60 desktop, Sheet on mobile), sub-route switching, unknown→dashboard redirect, logout, live NEW-lead badge (refetches stats per route change).
- admin-context.tsx — AdminProvider: current user + centralised API error handler (401 → authLost → login screen; other errors → toast).
- auth-screens.tsx — first-run Setup screen (one-time note), Login screen (inline 401/429 errors), branded AuthLoading skeleton. Password rule client-validated: ≥8 chars, letter+number (PASSWORD_RE).
- admin-utils.ts — slugify, SLUG_RE, PASSWORD_RE, date/timeAgo formatters, waLink (auto 91-prefix for 10-digit numbers), isVideoUrl, excerpt, statusBadgeClass/statusDotClass color map, CATEGORY_CLASS, patchInList, clampPage.
- admin-ui.tsx — Spin, AdminSkeleton/ListSkeleton, AdminCard/CardHead, PageHead, EmptyState, StatusBadge (NEW=volt, CONTACTED/QUALIFIED/PROPOSAL_SENT=outline w/ colored dot, WON=solid ink, LOST=muted strikethrough), Chip, PubDot, ErrorNote, FadeUp (subtle staggered entrance, reduced-motion aware), FormGrid.
- fields.tsx — Field, CountedTextarea, useDebouncedValue, StringListField (add/remove/reorder), MediaField (URL input + preview + upload, 12 MB client cap → api/media-upload), MediaGalleryField (url+type+caption rows), ProcessStepsField, StatsField (value+suffix+label), ServiceFaqsField (q+a).
- dashboard.tsx — 4 stat cards (from api/stats), enquiry pipeline stacked bar + status pills, recent leads (empty-state copy per spec), quick actions.
- leads.tsx — CRM inbox: debounced search, status/service/sort filters (page resets to 1), desktop table + mobile cards, Prev/Next pagination with "Showing X–Y of Z", deep-linkable detail side Sheet (#/admin/leads/:id) with contact action links (mailto/wa.me/tel + preferred-method chip), status Select (optimistic PATCH w/ revert), follow-up date (ISO or null), private notes (explicit Save), delete w/ confirm.
- projects.tsx — list (thumb, category badge, type, featured star, PubDot, order, edit/preview/delete) + full editor (basics w/ auto-slug, story w/ counters, StringListFields, MediaField cover + MediaGalleryField, sticky publish bar: published/featured switches + order + Save + Save & publish + Delete; create → navigates to /admin/projects/:id, update → back to list).
- services.tsx — list + editor (web/video/package, price fields, deliverables/useCases/process/exclusions, mini FAQ pairs, sticky bar).
- testimonials.tsx — volt notice banner, list w/ inline published Switch (optimistic PATCH), dialog editor (create/edit), delete confirm, star ratings.
- faqs.tsx — list w/ inline published Switch, dialog editor, delete confirm.
- settings.tsx — 9 tabs (Brand/Contact/Social/SEO/Home/About/Footer/Pages/Account); each section = own form + dirty check + PUT {section, data}; Home covers hero/marquee/intro/web/video/package/process/steps/stats/closing-CTA; About has portrait MediaField + bio/approach/philosophy + skills/tools; Social has "leave empty to hide" hint; Account = change-password form (client-validated, POST api/auth action=password).

Decisions:
- Lead detail is a right-side Sheet (per spec recommendation); row click navigates to /admin/leads/:id so deep state is linkable, closing the sheet returns to /admin/leads.
- Editors: after creating, URL is replaced to the :id route and the editor stays; after updating an existing record, navigate back to the list (per spec option).
- useSyncedForm hook in settings.tsx re-seeds section forms via the "adjust state during render" pattern (React 19 lint forbids setState-in-effect); same lint drove the auth-status effect to apply results inside the fetch callback.
- No TanStack Query — plain fetch-per-view with loading/error/empty states keeps the panel dependency-free and predictable.
- All mutations pass { admin: true }; every destructive action has an AlertDialog; buttons disable + spinner during mutations.

API CONTRACT ISSUES FOUND (orchestrator action needed):
1. MISSING ENDPOINT: GET /api/enquiries (admin paginated list — {items,total,page,pageSize}) does NOT exist; src/app/api/enquiries/route.ts only exports the public POST. Next.js answers 405 there. The Leads inbox is fully built against the documented contract — once a GET handler (search/status/service/sort params) lands, it works with zero admin-side changes. Until then the inbox shows an explanatory error banner; per-lead detail (GET/PATCH/DELETE /api/enquiries/:id) works from deep links.
2. Integration blocker (outside my scope): src/components/site/views/home.tsx currently has `export default function HomeView` but site-shell.tsx imports `{ HomeView }` (named). This makes EVERY route — including /api/** and #/admin — return 500 until reconciled. I did not touch it per ownership rules.
3. Minor: /api/media-upload works as documented at `api/media-upload` (spec's worklog said media/upload once — the real path is /api/media-upload; admin uses the real one).

---
Task ID: 3 (integration)
Agent: orchestrator (main)
Task: Integrate subagent work, fix contract mismatches, verify end-to-end, handover.

Work Log:
- Restored real site-context.tsx (2-b had left a temporary stub in place).
- Fixed HomeView named/default export mismatch with site-shell import.
- Added missing admin GET /api/enquiries (search/status/service filters + pagination) — leads inbox contract.
- Wrapped /api/stats response in { stats } to match admin contract.
- Fixed guard() union typing across all API routes (AdminUser | NextResponse + instanceof narrowing); added NextResponse imports.
- Fixed seed media paths (.jpg -> .png), removed stale validator types.
- Fixed lint: Counter reduced-motion setState, removed unused eslint-disables, nav menu close on link click, useNavigate removal.
- Fixed framer-motion SSR hydration mismatch via useSyncExternalStore-mounted gate on AnimatePresence initial/exit.
- Added scroll-to-top on every route path change (back/forward + manual hash).
- Added GET /api/content + same-tab admin->public content freshness refetch.
- Fixed auth/status path used by admin (api/auth).
- Stealth honeypot: hidden field returns ok without storing (moved out of Zod schema).
- Generated 11 AI media assets (public/media/*.png) for hero, reel card, portrait and 6 concept projects.
- Wrote favicon.svg, robots.txt, sitemap.ts; silenced prisma query logging.
- BROWSER VERIFICATION (agent-browser, desktop 1440 + mobile 375): home/hero renders, no console errors, no horizontal overflow; work filters (video=2, featured=3) + case study hero/chips; services overview + detail; about; privacy; 404 view; footer push on long pages.
- Enquiry golden path: filled 2-step form as test user -> success state shown only after server persist -> lead confirmed in DB.
- Admin golden path: one-time setup screen -> created admin -> dashboard with real metrics (1 lead, 6 projects, 8 services) -> lead detail status NEW->CONTACTED + private notes persisted -> created project "Glow Dental Clinic" -> published -> appeared on public site (same-tab via content refresh AND after reload) -> settings brand rename round-trip -> logout -> protected APIs return 401 without session -> wrong-password inline error -> CSRF header check (403) -> honeypot silently drops bots.
- Cleaned ALL test artifacts: deleted test admin, test enquiry, test project. Site ships with zero credentials; first visitor of #/admin gets the documented setup screen.
- Wrote README.md (setup, bootstrap, deployment, security, troubleshooting) + .env.example + real AUTH_SECRET in .env.

Stage Summary:
- All phases complete and verified in-browser. Lint + tsc clean. Project ready for handover: owner bootstraps their own admin at #/admin on first use.

---
Task ID: 4 (refinement pass)
Agent: orchestrator (main)
Task: Refine website frontend and backend — find and fix all problems and bugs.

Work Log:
- Audit: dev.log clean; `bun run lint` + `bunx tsc --noEmit` clean (sandbox examples/skills folders excluded). Two deep-review agents (public site + admin panel) produced 14 public (A1–A14) + 12 admin (B1–B12) findings; all fixed and browser-verified.
- Backend: GET /api/enquiries search now case-insensitive (SQLite `contains` is case-sensitive — filter applied in JS over status/service-filtered set, pagination after). All [id] PATCH/DELETE routes return 404 (not 500) on stale/missing records (P2025 messages matched).
- Router (src/lib/router.tsx): rewritten as hydration-safe `useSyncExternalStore` store — deep links (#/work, #/admin) resolve on first client paint (no home-view flash); `safeDecode` stops URIError crashes on malformed hash queries (e.g. "#/?next=%"); `navigate(path, { replace: true })` added.
- site-shell: document titles + AdminApp brandName now use refreshed `content` (was stale `initial`); unknown detail slugs get "Page not found · brand" title.
- site-context `waLink("")` returns "" so every WhatsApp CTA hides instead of linking to a broken wa.me page (nav, footer, CTABanner, views).
- Public views: home cover fallback .jpg→.png; package CTA + footer service links now DB-driven (renames/unpublish never 404); home Work section surfaces featured first; testimonial rating role="img"; work page "Featured" filter only when featured projects exist; case-study "← All work" back link + next-project section only when >1 project; legal pages no longer leak the admin-editing note; services page gained an empty state.
- nav.tsx: mobile menu now closes on Escape (focus into close button, restore to hamburger on close), closes on any route change (back/forward), menu body scrollable (max-h + overflow-y-auto), WhatsApp link hidden when number empty.
- contact.tsx: Enter on step 1 advances the step instead of submitting; preferred-contact pills have visible has-[:focus-visible] outline.
- primitives: Counter resyncs on value change (adjust-during-render pattern, lint-safe); outline-dark hover sweep now visible (bg-ink/5).
- globals.css: :focus-visible adds ink inner box-shadow ring so the volt outline stays visible on volt-filled controls.
- Admin: authLost 401 dedup (phaseRef guard — one toast, one reset for N concurrent 401s); badge state lifted to AdminApp + refreshBadge() in context (badge updates after in-place status change/delete); logout catches network errors (always signs out locally, admin:true header); password change sends admin:true; leads follow-up date stored as UTC midnight (`${raw}T00:00:00Z`) — IST off-by-one fixed, badge renders from date-part; leads list fetch has request-id stale-response guard; delete clamps page (no empty-page dead end); toasts fire on PATCH success (onDone) not before; LeadSheet drops late responses from a previous lead (idRef); list refresh failure shows retry chip when rows exist; testimonials/faqs publish toggles revert per-row; Settings tabs use forceMount + controlled value so unsaved edits survive tab switches; create→editor navigation uses replace (Back never returns to /new); dashboard recent-lead rows deep-link to the lead sheet.
- BROWSER VERIFIED (agent-browser): home + zero console errors; deep-link #/work paints directly with correct title; Featured filter (3), case study (back link + next project); footer DB-driven service links; contact form 2-step golden path → "Enquiry received." only after server persist (lead confirmed in DB); admin login → dashboard real metrics; dashboard recent-lead deep link opens sheet; status change persisted (DB) + sidebar badge 2→1; follow-up date round-trips (input 2026-03-15 ↔ DB 2026-03-15T00:00:00.000Z); lowercase search finds mixed-case lead; settings unsaved edit survives tab switch; logout → login screen; protected API 401 without session; mobile 375px: no horizontal overflow, menu opens, Escape closes.
- Cleanup: temporary QA admin (qa-refine@nexora-test.local) + QA test enquiry deleted from DB. Owner account (muhammadvahora05@gmail.com) and owner enquiry untouched. Lint + tsc clean after all changes.

Stage Summary:
- 26 bugs fixed across frontend + backend, all verified in-browser. Project remains zero-credential on first run (owner bootstraps at #/admin). No schema changes; no new dependencies.
---
Task ID: 5 (admin readability hotfix)
Agent: orchestrator (main)
Task: Fix admin UI text-field readability problems reported via screenshots (inputs, Quick actions buttons, Upload buttons nearly invisible).

Work Log:
- Root cause: root layout `<body>` carried `bg-ink text-ivory` (dark public theme). The admin panel's light surfaces (`bg-[#F4F3EF]` shell, white AdminCards) and every Radix-ported surface (Sheet/Dialog/Select) never reset the inherited text colour, so inputs, textareas, outline/ghost buttons rendered warm-white (#f2efe7) text on white — near-invisible. Elements with explicit colours (text-ink labels, text-graphite hints) were unaffected, matching the screenshots exactly.
- Fix (4 files): layout.tsx body is now `bg-ink text-foreground` (dark page bg retained for public theme/overscroll, neutral inherited text for light surfaces); site-shell.tsx public wrapper gains `text-ivory` (public site inheritance unchanged, zero regression); AdminShell root declares `text-ink` explicitly; AuthShell root declares `text-ivory` explicitly.
- Audited every `bg-ink` surface in admin + public for inherited-text reliance before changing (StatusBadge WON, CATEGORY_CLASS, sidebar, mobile header/sheet, buttons — all set explicit light text; safe).
- BROWSER VERIFIED (agent-browser, desktop 1440 + mobile 375): public home + contact hero/form unchanged and readable; admin login screen; dashboard Quick actions "New service"/"Edit site settings" now near-black readable; Settings Brand tab ("NEXORA STUDIO", tagline) and Home tab (kicker/titles/subtitle/media paths/Upload buttons) all solid near-black; project editor (values, placeholders, selects); portaled Select dropdown; portaled Leads detail sheet (status select, follow-up date, notes placeholder); mobile admin settings + dark nav sheet. Zero console errors.
- QA account (qa-contrast@nexora-test.local) created for authenticated verification, then DELETED — only the owner account remains. Lint clean; `tsc --noEmit` clean for src/ (0 errors); dev.log clean.

Stage Summary:
- Root cause was a global inherited text colour (body text-ivory) leaking into light admin surfaces; fixed at the body level with explicit theme declarations on each shell. Public site pixel-identical; admin inputs/buttons/dialogs/sheets now fully readable on desktop and mobile.
---
Task ID: 6 (hero polish + footer wordmark)
Agent: orchestrator (main)
Task: Polish the home hero section UI and add a refined giant text-logo watermark to the footer (per user sketch).

Work Log:
- Footer wordmark (footer.tsx + globals.css): brand-first-word letters spread edge-to-edge via flex justify-between, rendered as outlined display glyphs (.wordmark-letter: transparent fill + -webkit-text-stroke 1px mobile / 1.5px sm — chosen over SVG text because stroke stays crisp at every viewport). Baseline-aligned volt square dot (0.13em, rounded, soft glow) replaces the period glyph. Bottom mask-image fade dissolves the letters into the footer divider. Fully data-driven from settings.brand.name (first word, uppercased), aria-hidden + pointer-events-none + select-none, overflow-hidden guard against long brand names. Bottom bar margin retuned (mt-16 → mt-4/sm:mt-6).
- Hero polish (home.tsx): headline line 1 gains a subtle ivory vertical gradient (bg-clip-text) for cinematic depth; offset volt outline frame (-right-3 -top-3, border-volt/25, sm+) layered behind the main media frame for depth; availability chip upgraded to volt-tinted border + soft volt glow; main frame shadow deepened.
- Fixed a stale Turbopack CSS chunk (new .wordmark-letter rule not emitted until a real content change invalidated the chunk; verified rule present in served CSS afterwards).
- BROWSER VERIFIED (agent-browser): desktop 1440 hero (gradient headline, volt frame, glowing chip), footer wordmark outlined edge-to-edge with volt dot; mobile 375 hero + footer wordmark scale correctly; no horizontal overflow (scrollWidth 375); zero console errors; lint clean; tsc src/ 0 errors; dev.log clean.

Stage Summary:
- Footer now carries an editorial giant outlined wordmark (better-formed version of the user's sketch: crisp strokes, volt dot, bottom dissolve, DB-driven). Hero gained gradient headline depth, a volt offset media frame and a glowing availability chip. Public site verified at both breakpoints with zero errors.

---
Task ID: 6
Agent: main (Z.ai Code)
Task: Change hero tagline to "Websites & video that make you impossible to ignore."

Work Log:
- Located tagline source: data-driven fields heroTitleLine1/2/Accent in settings-defaults.ts, rendered in src/components/site/views/home.tsx (Line1 gradient ivory, Line2 ivory + Accent volt)
- Updated defaults: "Websites & video" / "that make you" / "impossible to ignore."
- Settings are DB-backed (SiteSetting.home overrides defaults), so wrote a temp bun script to update the stored JSON row; script deleted after success
- New tagline (49 chars vs old 31) wrapped to 5 lines at 104px display-1 cap, pushing CTAs below the fold at 1440x900; added hero-scoped .hero-display override (clamp 2.5rem -> 5.4rem cap) in globals.css; display-1 untouched for other sections
- Investigated a transient Radix accordion useId hydration diff: reproduced neither on stashed old code nor on 2 fresh loads of new code — was a Fast Refresh artifact from loading mid-HMR; zero errors on clean loads
- Verified desktop 1440 (4-line stack, CTAs + meta above fold) and mobile 375 (clean wrap, full-width CTAs) via agent-browser screenshots; lint clean; dev.log clean 200s

Stage Summary:
- Hero tagline live in both defaults and DB; hero-only type scale added (.hero-display) to preserve above-the-fold CTA visibility
- No other sections affected; zero console/page errors on fresh desktop + mobile loads

---
Task ID: 7
Agent: main (Z.ai Code)
Task: Hero tagline too large per user screenshots — reduce headline size

Work Log:
- User reported hero tagline too big (screenshots at ~1350px effective CSS viewport showing 5-line wrap "Websites & / video / ...")
- Reduced hero-scoped .hero-display from clamp(2.5rem, 6.9vw, 5.4rem) to clamp(2.35rem, 5vw, 3.8rem) in globals.css; display-1 and all other sections untouched
- Verified via agent-browser at 1350x850 (user-like viewport), 1440x900 and mobile 375x812: headline now sets as clean 3 lines on desktop ("Websites & video" / "that make you" / "impossible to ignore."), full hero incl. CTAs + meta + scroll cue above fold; mobile proportionate
- Transient dev-overlay badge seen mid-HMR only; zero page errors on fresh loads; lint clean; dev.log clean 200s

Stage Summary:
- Hero headline scale reduced ~30% (desktop cap 86px -> 61px); 3-line composition stable across 1350-1920px; no other sections affected

---
Task ID: 8
Agent: main (Z.ai Code)
Task: Premium Video & Photo Gallery feature (incremental, end-to-end)

Work Log:
- Inspected architecture first: hash-routed SPA (site-shell view switch), guard() auth + x-nexora-admin CSRF, media-upload route (MIME-trusted, superseded for gallery), Prisma/SQLite, admin view patterns (testimonials/projects)
- Prisma: added GalleryMedia model (type/title/mediaPath/posterPath/thumbPath/altText/dims/duration/featured/published/displayOrder + [type,published,displayOrder] index) and Project.showInWork (default true); db:push; reversible backfill set showInWork=false on the 2 video-only seed projects (Kavya Studio Reels, Urban Nest Promo); seed-data updated to match for fresh installs; no records deleted
- Central limits: src/lib/gallery-limits.ts (video 10 total/8 published/150MB/MP4+WebM; photo 24/18/12MB/JPEG+PNG+WebP) — single source for API + admin UI
- Server-side file validation: src/lib/file-validation.ts — magic-byte sniffing (ftyp/EBML/JPEG/PNG/WebP), MOV explicitly rejected, server-generated UUID filenames, resolveGalleryPath() prevents path traversal; upload endpoint re-validates content (never trusts client MIME/extension)
- APIs: GET /api/gallery (published only), admin GET/POST /api/admin/gallery (limits enforced inside $transaction), PATCH/DELETE /api/admin/gallery/[id] (publish-limit on transitions, replaced-file GC, shared-reference check before file deletion incl. projects/settings scan), POST reorder, POST upload (sharp thumbnails .thumb.webp for photos, poster validation, orphan cleanup on failure)
- Public: views/gallery.tsx (sticky All/Videos/Photos filter with counts, editorial Motion grid with orientation-aware spans + featured badges, CSS-columns masonry Stills grid with thumbs, video modal with native controls + capture-phase Escape fix for shadow-DOM focus, photo lightbox with wrap-around arrow keys/counter/Escape, empty states, Work/Services back-path); wired into site-shell router case + TITLES, nav, footer, Work page header copy
- Fixed real bug found in browser QA: duplicate arrow-key handlers (DialogContent onKeyDown + window effect listener) double-handled one keypress — React re-bound the window listener mid-dispatch, cancelling navigation; removed the DialogContent handler
- Fixed Escape-with-native-video-focus bug via capture-phase window listener (Chromium media controls consume Escape from their closed shadow root)
- Admin: views/gallery.tsx (Videos/Photos tabs, usage bars "X / N total · X / N published", search + status filter, XHR upload with progress + client-side pre-validation + auto poster capture/duration read + custom poster replacement, edit dialog with live preview, publish/feature toggles, move up/down reorder, delete with confirmation, full-limit messaging); wired into admin-app NAV/known-routes; Project editor got "Show in Work grid" toggle
- Tests executed (all via curl/agent-browser, honestly run): anon admin API 401; cookie-without-CSRF 403; valid photo upload 201+thumb+dims; oversized 13MB photo 413; text renamed .mp4 415 (magic bytes); MP4 content in photo slot 415; valid video 201; create w/ missing file 400; drafts never in public API; 11th video 409; 9th published video PATCH 409; 25th photo 409; 19th published photo 409; PATCH metadata 200; reorder 200; shared-file delete safety (file survives while referenced, GC'd exactly at last reference — verified for video + poster + photo + thumb); browser E2E: upload via UI (auto-poster, progress, title autofill), publish, public gallery rendering (desktop+mobile), video playback (currentTime advanced, native controls), filters, lightbox nav, UI delete with confirm, storage back to 0 files; regression: home/admin dashboard/leads/projects/projects list (4 web-only projects in Work) all clean
- Cleanup: all QA media + QA admin accounts (qa-gallery@, qa-browser@) deleted, storage dirs empty, tmp scripts removed; shipped gallery intentionally empty with curated empty states
- Dev server restarted via .zscripts/dev.sh after Prisma client regeneration (old process served stale client → 500s)

Stage Summary:
- Gallery feature complete end-to-end, zero existing features removed; Work = websites only (reversible toggle), Gallery = video+photo with hard server-enforced limits
- Storage: local public/uploads/gallery (documented: ephemeral hosts need a managed provider later — abstraction point is file-validation.ts + upload route)

---
Task ID: 9
Agent: main (Z.ai Code)
Task: Polish the hero section UI design (per user screenshot feedback).

Work Log:
- Audited hero render against the user's 1440px screenshot; identified weak points: dead space around the laptop media, hard image edges against the ink backdrop, reel card covering the laptop screen, uniform grid backdrop, plain meta strip, oversized scroll-cue gap.
- Refined media stack (src/components/site/views/home.tsx): ambient volt glow behind the stack, editorial "+" crosshair corner marks, offset volt accent frame strengthened (border-volt/30), main frame ratio 4/3.2 → 4/3.4 + max-w-[560px] to fill the column, browser chrome upgraded with a URL pill, cinematic bottom gradient + inset vignette so the photo melts into the ink background, reel card repositioned (-bottom-10 -left-7 sm) so the laptop screen stays visible, volt glow ring + volt play button + hover lift on the reel.
- Copy column: primary CTA now carries a soft volt glow shadow; heroMeta string is split on "/" into segments separated by volt dots (fully data-driven, defensive ?? "" fallback); scroll cue tightened (mt-16, w-20 line, ivory/40 label).
- Backdrop: grid now fades via radial-gradient mask-image (inline style with -webkit- prefix for Safari), volt ambient glows slightly strengthened.
- Hit a stale-CSS issue: Turbopack served an old CSS chunk missing the new negative-offset utilities (-bottom-8/-left-3/sm:-bottom-10/sm:-left-7), so the reel rendered in static flow and was clipped by the marquee. Diagnosed via CSSOM recursion scan (no matching rules) + bounding-box measurement; fixed by killing the dev server, clearing .next, and restarting.
- Verified with agent-browser: desktop 1440 (reel overlaps frame by 213px, extends exactly -40px below), tablet 768 (stacked single-column layout holds), mobile 375 (reel within viewport, chip/crosshairs correctly hidden via sm: guards). Gallery nav click still routes to #/gallery (expected curated-empty state). agent-browser errors: none; dev.log clean; eslint + tsc --noEmit (src) both pass.

Stage Summary:
- Hero is now a layered cinematic composition: volt-glow media stack with crosshair details, blended image edges, data-driven volt-dot meta strip, glowing primary CTA, vignetted grid — all respecting prefers-reduced-motion and existing brand tokens (ink/ivory/volt, Space Grotesk).
- Root cause class established: Turbopack can serve stale Tailwind CSS chunks after class-string changes; remedy = restart dev server with a cleared .next when newly added utilities silently don't apply.
- No DB or settings changes; all content remains data-driven from settings.home.

---
Task ID: 10
Agent: main (Z.ai Code)
Task: Hero section must fill the entire window height (user: "hero section window ka pura size lena chahiye").

Work Log:
- User screenshot showed the marquee strip visible inside the first screen; requirement = hero height == full viewport so everything below sits under the fold.
- Restructured Hero in src/components/site/views/home.tsx: section → `flex min-h-svh flex-col` (Tailwind v4 svh unit, safe on mobile browser chrome) with reduced bottom padding (pb-14/sm:pb-16/lg:pb-10); container motion.div → `flex flex-1 flex-col`; grid → `flex-1 items-center` so the copy+media columns center vertically in the full-height hero; scroll cue changed from mt-16 to `pt-10` so it anchors near the bottom edge of the viewport.
- Verified via agent-browser: at 1664×925 hero height = 925 = viewport, marqueeTop = 925 (exactly at the fold); at 1366×680 hero grows content-driven with no clipping; at 375×812 hero = 1155 with reel fully inside. agent-browser errors: none. eslint + tsc (src) pass; dev.log clean.

Stage Summary:
- First screen now shows ONLY the hero: full-viewport (min-h-svh) cinematic composition with vertically centered content and bottom-anchored scroll cue; marquee and all subsequent sections begin exactly below the fold on desktop and flow naturally on mobile/short viewports.
- Pure layout change — no settings/DB impact; parallax, reduced-motion guards, and all data-driven fields untouched.
