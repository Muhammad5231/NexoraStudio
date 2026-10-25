import type { Settings } from "./types";

// ---------------------------------------------------------------------------
// Seed content: services, projects (clearly labelled Concept Projects) & FAQs.
// All of it is editable / removable from the admin panel.
// ---------------------------------------------------------------------------

export const SEED_SERVICES = [
  {
    slug: "small-business-websites",
    title: "Small-Business Websites",
    category: "web",
    summary:
      "A complete multi-page website that makes your business look established, load fast and turn visitors into enquiries.",
    description:
      "Most small businesses lose customers to a slow, outdated or missing website. We design and hand-build a site around how your customers actually decide — what you offer, proof that you're legit, and one obvious next step. Built on modern tooling, tuned for phones first, and structured for Google indexing from day one.",
    deliverables: [
      "Up to 5 pages (Home, About, Services, Gallery, Contact)",
      "Mobile-first responsive design",
      "Contact / enquiry form with WhatsApp handoff",
      "Basic on-page SEO + Google Search Console setup",
      "Speed & accessibility tuning",
      "Domain + hosting deployment assistance",
      "2 revision rounds per page",
      "14 days post-launch support",
    ],
    useCases: [
      "Local shops and showrooms that need a credible online presence",
      "Restaurants and cafés with menu, gallery and location pages",
      "Service professionals — consultants, salons, studios, clinics",
      "Businesses replacing an outdated or broken website",
    ],
    process: [
      "Discovery call + content checklist",
      "Sitemap and page-by-page wireframe",
      "Visual design direction (1 concept)",
      "Build, review round, polish",
      "Launch, indexing and handover walkthrough",
    ],
    exclusions: [
      "Logo design & brand identity systems",
      "E-commerce with online payments (quoted separately)",
      "Ongoing content writing",
    ],
    faqs: [
      {
        q: "How long does a small-business website take?",
        a: "Typically 2–3 weeks from content handover to launch, depending on feedback speed.",
      },
      {
        q: "Can I update the website myself later?",
        a: "Yes — you get a guided walkthrough, and maintenance plans are available if you'd rather not touch it.",
      },
    ],
    startingPrice: "₹14,999",
    priceNote: "final quote depends on pages & features",
  },
  {
    slug: "landing-pages",
    title: "Landing Pages",
    category: "web",
    summary:
      "One focused page with one job: turn ad clicks or bio links into enquiries and signups.",
    description:
      "A landing page lives or dies by clarity. We build single pages with a sharp headline, scannable proof and a friction-free enquiry flow — no navigation rabbit holes. Ideal for campaigns, course batches, product launches and link-in-bio destinations.",
    deliverables: [
      "Single high-conversion page",
      "Copy structure & section plan",
      "Lead form / WhatsApp CTA integration",
      "Mobile performance tuning (90+ targets)",
      "Thank-you / confirmation state",
      "1 revision round",
      "7 days post-launch support",
    ],
    useCases: [
      "Coaching institutes promoting a new batch",
      "Ad campaign destinations that need quality score",
      "Product or service launches",
      "Creators who need a proper link-in-bio page",
    ],
    process: [
      "Goal & audience short call",
      "Message hierarchy + wireframe",
      "Design & build",
      "Review + launch",
    ],
    exclusions: [
      "Ad campaign management",
      "A/B testing infrastructure",
      "Copywriting from scratch (we structure, you provide raw points)",
    ],
    faqs: [
      {
        q: "Can you connect the form to WhatsApp?",
        a: "Yes — enquiry forms can open WhatsApp with a pre-filled message, or send to email. Your choice.",
      },
    ],
    startingPrice: "₹7,999",
    priceNote: "single page, delivered in ~1 week",
  },
  {
    slug: "portfolio-websites",
    title: "Portfolio & Personal Brand Sites",
    category: "web",
    summary:
      "A portfolio that does your work justice — editorial layouts, case studies and a site that feels like you.",
    description:
      "Templates make every portfolio look the same. We build a personal site with intentional typography, real case-study layouts and motion that shows craft — for photographers, designers, editors, creators and freelancers who are their own brand.",
    deliverables: [
      "Home, work grid, case-study template, about, contact",
      "CMS-style work management (add projects yourself)",
      "Custom typography & motion design",
      "Image optimization for fast galleries",
      "Basic SEO + social share cards",
      "2 revision rounds",
    ],
    useCases: [
      "Photographers and videographers",
      "Designers, editors and illustrators",
      "Freelancers upgrading from Instagram-only presence",
    ],
    process: [
      "Work audit + structure plan",
      "Design direction",
      "Build + populate first 3 case studies with you",
      "Review, launch, handover",
    ],
    exclusions: ["Photo retouching", "Content writing for case studies"],
    faqs: [
      {
        q: "Can I add new projects without code?",
        a: "Yes — the site ships with a private admin panel where you add projects, images and links yourself.",
      },
    ],
    startingPrice: "₹9,999",
    priceNote: "varies with case-study count",
  },
  {
    slug: "coaching-institute-websites",
    title: "Coaching Institute Websites",
    category: "web",
    summary:
      "Purpose-built websites for coaching institutes and academies — courses, batches, faculty and an enquiry pipeline that fills seats.",
    description:
      "Parents and students judge institutes online before they ever visit. We build institute websites that answer real questions — courses, timings, results, faculty, fees structure — and convert interest into admission enquiries via form and WhatsApp.",
    deliverables: [
      "Up to 6 pages incl. Courses & Batch details",
      "Faculty and results/testimonial sections",
      "Admission enquiry form + WhatsApp click-to-chat",
      "Google Maps embed & local SEO basics",
      "Photo gallery with fast loading",
      "Basic on-page SEO + indexing",
      "2 revision rounds",
    ],
    useCases: [
      "Tuition centres and coaching academies",
      "Skill-training institutes",
      "Hobby & activity classes (music, art, sport)",
    ],
    process: [
      "Discovery call + content checklist",
      "Structure & design direction",
      "Build + review",
      "Launch before your admission season push",
    ],
    exclusions: [
      "Student login portals / LMS features",
      "Online fee payment (quoted separately)",
    ],
    faqs: [
      {
        q: "Can we update batch timings ourselves?",
        a: "Yes — we hand over an editable structure, or you can send updates under a maintenance plan.",
      },
    ],
    startingPrice: "₹12,999",
    priceNote: "seasonal timing support available",
  },
  {
    slug: "website-maintenance",
    title: "Website Care & Maintenance",
    category: "web",
    summary:
      "Monthly care plans that keep your site updated, backed up, fast and secure — so you never think about it.",
    description:
      "A website is not a one-time purchase. Care plans cover content updates, small design tweaks, uptime monitoring and technical housekeeping — with a direct line to the person who built your site.",
    deliverables: [
      "Content & image updates (up to 4 requests/month)",
      "Minor design or layout tweaks",
      "Uptime & performance monitoring",
      "Backup and dependency updates",
      "Monthly health summary",
    ],
    useCases: [
      "Businesses that frequently change fees, menus or schedules",
      "Sites that need a reliable developer on call",
    ],
    process: ["Pick a plan", "Requests via WhatsApp/email", "Turned around in 48h"],
    exclusions: ["New pages or major features (quoted separately)", "Third-party service fees"],
    faqs: [
      {
        q: "What if I need something big mid-month?",
        a: "Bigger changes are quoted separately — care plan hours never balloon into surprise invoices.",
      },
    ],
    startingPrice: "₹1,499/mo",
    priceNote: "cancel anytime",
  },
  {
    slug: "reels-shorts-editing",
    title: "Reels & Shorts Editing",
    category: "video",
    summary:
      "Scroll-stopping Instagram Reels and YouTube Shorts — tight cuts, clean captions, hooks that survive second one.",
    description:
      "You send raw footage; you get back platform-ready edits with strong hooks, rhythm-matched cuts, readable captions and sound design. Built for creators, coaches and businesses posting consistently who don't have hours to spend in an editor.",
    deliverables: [
      "Edited vertical video (up to 60s each)",
      "Animated captions & keyword emphasis",
      "Hook structuring from your raw take",
      "Licensed music / sound design",
      "Platform-ready export + cover frame",
      "1 revision round per video",
    ],
    useCases: [
      "Creators posting 3–5 times a week",
      "Coaches repurposing long videos into clips",
      "Businesses showing products, process and results",
    ],
    process: [
      "Send footage + reference style",
      "We confirm the hook & structure",
      "Edit delivered in 24–48h",
      "Revision + final export",
    ],
    exclusions: [
      "Filming / videography",
      "3D animation & VFX-heavy effects",
      "Script writing (light guidance included)",
    ],
    faqs: [
      {
        q: "What's the turnaround time?",
        a: "Standard 48 hours per batch; rush 24-hour delivery available on request.",
      },
      {
        q: "Do you offer monthly packs?",
        a: "Yes — packs of 8 or 12 videos per month at a lower per-video rate.",
      },
    ],
    startingPrice: "₹999/video",
    priceNote: "pack pricing available",
  },
  {
    slug: "promo-product-videos",
    title: "Promo & Product Videos",
    category: "video",
    summary:
      "30–90 second promotional videos that make your product, service or event look premium — built for ads and pinned posts.",
    description:
      "Longer than a reel, sharper than an ad agency cut. We shape your footage (or curated stock) into a structured promo: problem, reveal, proof, call-to-action — with clean typography, motion graphics and a soundtrack that carries it.",
    deliverables: [
      "Promo video up to 90 seconds",
      "Script structure from your brief",
      "Motion graphics & title cards",
      "Color grading + sound mix",
      "16:9, 1:1 and 9:16 exports",
      "2 revision rounds",
    ],
    useCases: [
      "Product launches and offers",
      "Institute admission-season promos",
      "Event recaps and announcements",
    ],
    process: [
      "Brief + footage collection",
      "Structure & style approval",
      "Edit + grade + mix",
      "Revisions + multi-format export",
    ],
    exclusions: ["Videography/filming", "Voice-over artist fees (we handle sourcing)"],
    faqs: [
      {
        q: "We don't have footage. Now what?",
        a: "We can plan a simple shot list you can film on a phone, or design the promo around licensed stock — options are discussed in the brief call.",
      },
    ],
    startingPrice: "₹4,999",
    priceNote: "per finished video",
  },
  {
    slug: "launch-bundle",
    title: "The Launch Bundle — Website + Content",
    category: "package",
    summary:
      "Our most complete offer: a full small-business website plus a month of edited short-form content to launch it properly.",
    description:
      "Built for businesses that want to show up professional everywhere at once. You get a complete multi-page website and eight edited Reels/Shorts announcing it — one project, one point of contact, one price. Ideal around launches, rebrands and admission seasons.",
    deliverables: [
      "Multi-page website (up to 5 pages)",
      "Mobile-first responsive build + basic SEO",
      "8 edited Reels / Shorts (up to 60s each)",
      "Reusable caption style template",
      "Launch content calendar (simple)",
      "30 days post-launch support",
    ],
    useCases: [
      "New businesses with no web presence at all",
      "Institutes preparing for admission season",
      "Rebrands that need site + content in one push",
    ],
    process: [
      "Discovery + brand & content audit",
      "Website build (weeks 1–2)",
      "Content edit pass (weeks 2–3)",
      "Coordinated launch",
    ],
    exclusions: ["Filming", "Logo design", "Paid ad management"],
    faqs: [
      {
        q: "Can we split the bundle across months?",
        a: "Yes — website first, content the following month. Same price.",
      },
    ],
    startingPrice: "₹19,999",
    priceNote: "save ~20% vs booking separately",
  },
];

export const SEED_PROJECTS = [
  {
    slug: "aroma-house-cafe",
    title: "Aroma House",
    client: "",
    category: "Websites",
    projectType: "Concept Project",
    year: "2025",
    description:
      "A warm, editorial website for a neighbourhood specialty café — menu, story and a table-booking flow.",
    overview:
      "Aroma House is a concept brand for a neighbourhood specialty café. The site needed to do three jobs quietly well: make the space feel inviting within seconds, present a readable menu that works on a phone, and turn 'looks nice' into an actual table reservation.",
    problem:
      "Typical café websites bury the two things visitors actually want — the menu and the location — under heavy animations and PDFs that never load properly on mobile.",
    objectives: [
      "Make menu and location reachable in one tap from anywhere on the site",
      "Create a warm, editorial identity without heavy imagery",
      "Load fast on mid-range mobile data",
    ],
    designDirection:
      "Ivory paper tones, espresso-dark type and one muted accent. Large serif-flavoured headlines, generous spacing and full-bleed photography — closer to a printed menu than a tech landing page.",
    solution:
      "A five-page site with a sticky mini-nav, a menu rendered as fast HTML (no PDFs), a photo-led story page and a booking section that hands off to WhatsApp with a pre-filled message.",
    features: [
      "HTML menu with category shortcuts",
      "One-tap WhatsApp table booking",
      "Photo gallery with lazy loading",
      "Google Maps embed on contact page",
    ],
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Framer Motion"],
    coverImage: "/media/project-cafe.png",
    media: [
      { url: "/media/project-cafe.png", type: "image", caption: "Homepage hero — editorial layout" },
      { url: "/media/project-cafe-2.png", type: "image", caption: "Menu & story sections" },
    ],
    liveUrl: "",
    featured: true,
    published: true,
    order: 1,
  },
  {
    slug: "veda-academy",
    title: "Veda Academy",
    client: "",
    category: "Websites",
    projectType: "Concept Project",
    year: "2025",
    description:
      "A conversion-focused website for a coaching institute — courses, batches, faculty and an admission enquiry pipeline.",
    overview:
      "Veda Academy is a concept website for a growing coaching institute preparing for admission season. Parents shortlist institutes online long before visiting, so the site had to answer real questions fast and make enquiry effortless.",
    problem:
      "The typical institute site is a static brochure: courses listed without timings, no proof, and a 'contact us' page as the only next step.",
    objectives: [
      "Surface courses, batches and timings within one scroll of the homepage",
      "Build trust with faculty and results sections",
      "Create two effortless enquiry paths: form and WhatsApp",
    ],
    designDirection:
      "A confident academic look — deep green-ink surfaces, warm paper sections and a lime signal colour reserved for actions. Numbered course cards, timeline of results and a persistent enquiry bar on mobile.",
    solution:
      "A six-page site with course detail sections, a batch timetable block, faculty grid and a two-step enquiry form. Every page ends in a decision: call, WhatsApp or form.",
    features: [
      "Course & batch timetable sections",
      "Two-step admission enquiry form",
      "Faculty & results trust sections",
      "Sticky mobile enquiry bar",
    ],
    technologies: ["Next.js", "TypeScript", "Tailwind CSS", "Prisma"],
    coverImage: "/media/project-academy.png",
    media: [
      { url: "/media/project-academy.png", type: "image", caption: "Homepage with course highlights" },
      { url: "/media/project-academy-2.png", type: "image", caption: "Course detail & enquiry flow" },
    ],
    liveUrl: "",
    featured: true,
    published: true,
    order: 2,
  },
  {
    slug: "stride-fit-landing",
    title: "Stride Fit",
    client: "",
    category: "Landing Pages",
    projectType: "Concept Project",
    year: "2025",
    description:
      "A single-page launch site for a fitness studio's new batch — one message, one form, zero distractions.",
    overview:
      "Stride Fit is a concept landing page for a fitness studio launching evening batches. The page has exactly one job: convert local ad clicks into trial-session bookings.",
    problem:
      "Sending campaign traffic to a full website leaks attention — visitors wander, then leave without acting.",
    objectives: [
      "Communicate the offer in under 5 seconds",
      "Make trial booking feel like one small step, not a commitment",
      "Score 90+ on mobile performance for cheaper ad clicks",
    ],
    designDirection:
      "High-contrast dark theme with an electric accent, oversized numerals for pricing and proof, and a form that folds into the hero on desktop.",
    solution:
      "A single page: hook headline, three benefit blocks, trainer credibility strip, transparent pricing and a friction-free trial form with instant WhatsApp confirmation option.",
    features: [
      "Hero-integrated booking form",
      "Pricing & proof sections",
      "Sub-second mobile load target",
      "WhatsApp confirmation handoff",
    ],
    technologies: ["Next.js", "Tailwind CSS", "Framer Motion"],
    coverImage: "/media/project-stride.png",
    media: [
      { url: "/media/project-stride.png", type: "image", caption: "Landing page hero & form" },
    ],
    liveUrl: "",
    featured: false,
    published: true,
    order: 3,
  },
  {
    slug: "kavya-studio-reels",
    title: "Kavya Studio — Reels System",
    client: "",
    category: "Video Editing",
    projectType: "Concept Project",
    year: "2025",
    description:
      "A monthly short-form content system for a boutique design label — 8 reels, one recognisable caption style.",
    overview:
      "Kavya Studio is a concept monthly retainer for a boutique fashion label posting three to four times a week. The challenge isn't one good reel — it's eight good reels a month that still look like one brand.",
    problem:
      "Inconsistent caption styles and pacing make a feed feel noisy; viewers don't recognise the brand by second two.",
    objectives: [
      "Build a repeatable hook → payoff → loop structure",
      "One signature caption style across every video",
      "48-hour turnaround per batch",
    ],
    designDirection:
      "Clean kinetic typography, brand-colour captions with keyword pops, pace cuts to music transients and a consistent 0.8s hook window before the reveal.",
    solution:
      "A system: shared caption preset, edit templates for product shots vs. behind-the-scenes footage, and a monthly delivery calendar with a revision round per video.",
    features: [
      "Signature animated caption style",
      "Hook-first edit structure",
      "Batch delivery calendar",
      "Multi-platform safe-zone exports",
    ],
    technologies: ["Premiere Pro", "After Effects", "CapCut"],
    coverImage: "/media/project-reels.png",
    media: [
      { url: "/media/project-reels.png", type: "image", caption: "Edit workspace & caption system" },
    ],
    liveUrl: "",
    featured: true,
    published: true,
    order: 4,
  },
  {
    slug: "urban-nest-promo",
    title: "Urban Nest — Launch Promo",
    client: "",
    category: "Video Editing",
    projectType: "Concept Project",
    year: "2025",
    description:
      "A 60-second launch promo for a real-estate project — cinematic grading, typographic storytelling, multi-format exports.",
    overview:
      "Urban Nest is a concept promo for a residential real-estate launch. The video needed to carry premium positioning in 60 seconds for ads, WhatsApp forwards and lobby screens.",
    problem:
      "Real-estate promos usually drown in drone shots with no narrative — impressive frames, no memory.",
    objectives: [
      "Tell a 'day in the life' story instead of a feature list",
      "Premium grade and sound that survive phone speakers",
      "Deliver 16:9, 1:1 and 9:16 from one edit",
    ],
    designDirection:
      "Warm evening grade, slow reveals with typographic beats, a restrained music bed that swells twice, and negative space in the pacing so key frames breathe.",
    solution:
      "A structured 60-second cut: morning → work → evening → home, with six typographic beats and a final CTA card. Exported in three aspect ratios with platform-specific end cards.",
    features: [
      "Narrative-driven 60s structure",
      "Typographic beat system",
      "Cinematic color grade",
      "16:9 / 1:1 / 9:16 exports",
    ],
    technologies: ["Premiere Pro", "After Effects", "DaVinci Resolve"],
    coverImage: "/media/project-promo.png",
    media: [
      { url: "/media/project-promo.png", type: "image", caption: "Promo still — evening sequence" },
    ],
    liveUrl: "",
    featured: false,
    published: true,
    order: 5,
  },
  {
    slug: "lumen-portraits",
    title: "Lumen Portraits",
    client: "",
    category: "Websites",
    projectType: "Concept Project",
    year: "2025",
    description:
      "A gallery-first portfolio for a portrait photographer — huge images, invisible interface, zero clutter.",
    overview:
      "Lumen Portraits is a concept portfolio for a photographer whose work deserves silence. The interface disappears: full-bleed images, generous whitespace and navigation you barely notice.",
    problem:
      "Photo portfolios often fight their own content — grids, badges and widgets competing with the images.",
    objectives: [
      "Images as the interface — 80% of every viewport",
      "Sub-second gallery loads via image optimization",
      "An enquiry path that never interrupts browsing",
    ],
    designDirection:
      "Near-black canvas, hairline borders, oversized display type only on transitions. Hover states reveal, never decorate.",
    solution:
      "A masonry work grid with filtered collections, an immersive case-study template and a slim persistent contact strip. Images ship optimized in modern formats.",
    features: [
      "Filterable masonry gallery",
      "Immersive full-bleed case studies",
      "Persistent slim contact strip",
      "Optimized modern image formats",
    ],
    technologies: ["Next.js", "TypeScript", "Tailwind CSS"],
    coverImage: "/media/project-portfolio.png",
    media: [
      { url: "/media/project-portfolio.png", type: "image", caption: "Gallery grid — dark editorial theme" },
    ],
    liveUrl: "",
    featured: false,
    published: true,
    order: 6,
  },
];

export const SEED_FAQS = [
  {
    question: "What does a typical project cost?",
    answer:
      "Landing pages start at ₹7,999, small-business websites at ₹14,999, and reels from ₹999 per video. The Launch Bundle (website + content) starts at ₹19,999. Every quote is fixed-scope — you approve the number before we begin.",
  },
  {
    question: "How long will my project take?",
    answer:
      "Landing pages: about a week. Small-business websites: 2–3 weeks from content handover. Reels: 24–48 hours per batch. Timelines assume feedback within a working day — slow feedback shifts delivery.",
  },
  {
    question: "Do you work with businesses outside your city?",
    answer:
      "Yes — everything runs remotely over calls, WhatsApp and email. Most projects never need a single in-person meeting.",
  },
  {
    question: "What do you need from me to start?",
    answer:
      "Whatever you already have: your logo (if any), photos, service details and honest answers about your customers. If content is missing, we'll build a checklist together in the discovery call.",
  },
  {
    question: "Can I update my website myself afterwards?",
    answer:
      "Yes. You'll get a walkthrough of what's editable, and maintenance plans exist if you'd rather send updates and have them handled.",
  },
  {
    question: "How do payments work?",
    answer:
      "Typically 50% to begin, 50% on delivery. Monthly retainers and video packs are billed per month or per pack. No hidden charges — everything is in the written scope.",
  },
  {
    question: "What if I don't like the design?",
    answer:
      "Every project includes defined revision rounds, and the visual direction is approved before full build begins — so you're never surprised at the end.",
  },
];
