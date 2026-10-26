import type { Settings } from "./types";

// ---------------------------------------------------------------------------
// Default, editable content for first run. Everything here can be changed in
// the admin panel (Settings / Services / Projects) without touching code.
// Placeholders (WhatsApp number, email, owner name) are clearly generic.
// ---------------------------------------------------------------------------

export const DEFAULT_SETTINGS: Settings = {
  brand: {
    name: "NEXORA STUDIO",
    tagline: "Web Experiences · Visual Content · Digital Design",
  },
  contact: {
    email: "hello@nexorastudio.in",
    whatsapp: "919999999999",
    phone: "+91 99999 99999",
    location: "India — working remotely",
    serviceArea: "Across India (IST timezone)",
    hours: "Mon – Sat · 10:00 – 19:00 IST",
    responseTime: "Replies within 24 hours on working days",
  },
  social: {
    instagram: "",
    linkedin: "",
    youtube: "",
    x: "",
    behance: "",
  },
  seo: {
    title: "Nexora Studio — Websites & Video Content for Growing Businesses",
    description:
      "Independent creative studio building distinctive websites and scroll-stopping short-form video for small businesses, institutes and creators across India.",
    keywords:
      "web design india, freelance web developer, video editing, reels editing, coaching institute website, landing pages",
    siteUrl: "",
    ogImage: "/media/hero-main.png",
    googleSiteVerification: "",
  },
  home: {
    heroKicker: "Independent Creative Studio — India",
    heroTitleLine1: "Websites & video",
    heroTitleLine2: "that make you",
    heroTitleAccent: "impossible to ignore.",
    heroSubtitle:
      "Nexora is a one-person creative studio building distinctive websites and short-form video content for small businesses, institutes and creators across India — designed to be remembered, built to convert.",
    heroMeta: "Web Experiences / Visual Content / Digital Design",
    heroMediaMain: "/media/hero-main.png",
    heroMediaSecondary: "/media/hero-reel.png",
    ctaPrimary: "Start a Project",
    ctaSecondary: "Explore Our Work",
    marquee: [
      "Web Design",
      "Development",
      "Instagram Reels",
      "YouTube Shorts",
      "Landing Pages",
      "Promo Videos",
      "Technical SEO",
      "Brand Websites",
    ],
    introKicker: "The Studio",
    introTitle: "A focused pair of hands — not a faceless agency.",
    introBody:
      "Nexora Studio is run by a single developer-editor who takes your project from first call to final delivery. Strategy, design, code and cuts — handled by the same person you talk to. No hand-offs, no lost context, no agency theatre.",
    introPoints: [
      "Direct collaboration with the person actually building your project",
      "Design-led development with performance and SEO baked in from day one",
      "Honest timelines, fixed scopes and pricing you can plan around",
    ],
    webKicker: "Web Design & Development",
    webTitle: "Sites that load fast, read beautifully and convert.",
    webBody:
      "From single-page landing experiences to full multi-page business websites — hand-built with modern tooling, tuned for mobile and structured so Google can actually find you.",
    videoKicker: "Video Editing",
    videoTitle: "Short-form content that stops the scroll.",
    videoBody:
      "Reels, Shorts and promo videos cut with intent — tight pacing, clean captions, sound design and hooks that keep viewers past the first second.",
    packageKicker: "The Launch Bundle",
    packageTitle: "Website + first month of content. Sorted.",
    packageBody:
      "The fastest way for a small business to look professional online: a complete website plus a month of edited short-form content to announce it — one project, one point of contact.",
    packagePrice: "from ₹19,999",
    packageFeatures: [
      "Multi-page website (up to 5 pages)",
      "Mobile-first responsive build",
      "Basic on-page SEO + Google indexing",
      "8 edited Reels / Shorts (up to 60s each)",
      "Caption style templates you can reuse",
      "30 days post-launch support",
    ],
    packageCta: "Book the Bundle",
    processKicker: "How We Work",
    processTitle: "A small process that respects your time.",
    processSteps: [
      {
        step: "01",
        title: "Discover",
        body: "A short call or chat to understand your business, audience and goals. You get a clear scope, timeline and quote — no jargon.",
      },
      {
        step: "02",
        title: "Direction",
        body: "Structure, wireframes and a visual direction for websites; hooks, references and a content plan for video. You approve before we build.",
      },
      {
        step: "03",
        title: "Build",
        body: "Design turned into a fast, responsive website — or footage cut into tight, captioned edits. You review rounds at fixed checkpoints.",
      },
      {
        step: "04",
        title: "Launch & Support",
        body: "We go live, connect analytics and search indexing, then stay available for tweaks, fixes and content retainer work.",
      },
    ],
    stats: [
      { value: "2", suffix: "", label: "Crafts, practiced daily" },
      { value: "24", suffix: "h", label: "Usual response time" },
      { value: "100", suffix: "%", label: "Owner-built, never outsourced" },
      { value: "1", suffix: "", label: "Point of contact — the maker" },
    ],
    ctaTitle: "Have something in mind?",
    ctaBody:
      "Tell us about your project and get a reply within 24 hours — with honest advice on scope, timeline and budget. No pushy sales calls, ever.",
    ctaButton: "Start a Project",
  },
  about: {
    ownerName: "Your Name",
    role: "Founder · Developer & Editor",
    portraitUrl: "/media/portrait.png",
    bio: "Nexora Studio is an independent creative practice run by a student developer and self-taught editor. I started by building small sites for local businesses and cutting videos for creators — and kept refining both crafts until they became one service: helping small businesses look and sound professional online.\n\nI work with coaching institutes, local shops, startups, consultants and creators who need more than a template — but don't need (or want) a full agency invoice. Everything is built and edited by me, directly.\n\nWhen I'm not shipping client work, I'm studying interface design, motion and the boring-but-important parts of the web: performance, accessibility and SEO.",
    approach:
      "Small scope, executed properly, beats big scope executed badly. I'd rather launch a focused five-page site that loads instantly and reads clearly than sell you ten pages of filler. Same with video: a 30-second reel with one clear idea outperforms a messy 90-second cut.",
    skills: [
      "React & Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Responsive UI Development",
      "Framer Motion & GSAP",
      "Basic Technical SEO",
      "Visual & Interaction Design",
      "Short-form Storytelling",
    ],
    tools: [
      "VS Code",
      "Figma",
      "Adobe Premiere Pro",
      "After Effects",
      "CapCut",
      "Git & GitHub",
      "Vercel",
      "Notion",
    ],
    philosophy:
      "Good work is honest work: real deadlines, real prices, real samples labelled as samples. I'd rather under-promise and over-deliver than pitch a fantasy. And when something is outside my lane, I say so — then either learn it properly or point you to someone better.",
  },
  footer: {
    blurb:
      "An independent creative studio crafting websites and short-form video content for ambitious small businesses across India.",
    copyright: "Nexora Studio. All rights reserved.",
    note: "Sample work on this site is labelled Concept Project until replaced with genuine client work.",
  },
  pages: {
    privacy:
      "Last updated: placeholder — edit this text in Admin → Settings → Pages.\n\nThis Privacy Policy explains what information Nexora Studio collects when you use this website and how it is handled.\n\n1. Information you give us. When you submit the project enquiry form, we collect the details you provide: your name, business name, email, phone number (optional), service interest, project description, budget and timeline preferences. We use this information only to respond to your enquiry and manage the project relationship.\n\n2. Information collected automatically. Like most websites, basic technical information (browser type, pages visited) may be processed for security and analytics purposes.\n\n3. What we do NOT do. We do not sell your data, send spam, or share your enquiry details with third parties beyond services strictly needed to operate (e.g. hosting, email delivery).\n\n4. Data retention. Enquiry records are kept while there is a reasonable business relationship or follow-up need. You may ask us to delete your enquiry at any time by writing to the contact email on this site.\n\n5. Cookies. This site avoids non-essential cookies. If analytics are added later, this policy will be updated first.\n\nThis template is provided as a starting point and is not legal advice. Have it reviewed before relying on it.",
    terms:
      "Last updated: placeholder — edit this text in Admin → Settings → Pages.\n\nThese Terms of Service govern your use of this website and the engagement of Nexora Studio's services.\n\n1. Quotes & scope. Every project begins with a written scope and price. Work outside the agreed scope is quoted separately before it begins.\n\n2. Payments. Unless agreed otherwise, projects start with an advance (typically 50%) with the balance due on delivery. Maintenance or retainer work is billed monthly.\n\n3. Revisions. Each deliverable includes a defined number of revision rounds, agreed in the project scope. Additional rounds are billed at the stated hourly rate.\n\n4. Timelines. Timelines assume timely feedback and content (text, images, footage) from you. Delays in inputs shift delivery dates accordingly.\n\n5. Ownership. On full payment, final delivered files and website code become yours. The studio retains the right to showcase completed work unless NDA applies.\n\n6. Sample work. Projects labelled Concept Project or Demo Project are self-initiated samples, not client commissions.\n\n7. Liability. The studio is not liable for indirect losses arising from website downtime, third-party platform changes or content performance.\n\nThis template is provided as a starting point and is not legal advice. Have it reviewed before relying on it.",
    notFound: "The page you're looking for doesn't exist or has moved.",
  },
};
