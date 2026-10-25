// ---------------------------------------------------------------------------
// Shared domain types for NEXORA STUDIO
// NOTE: fields typed as string[] in the app are stored as JSON strings in
// SQLite (no scalar lists) and parsed by the content layer.
// ---------------------------------------------------------------------------

export type Settings = {
  brand: {
    name: string;
    tagline: string;
  };
  contact: {
    email: string;
    whatsapp: string; // digits only, international format e.g. 919876543210
    phone: string;
    location: string;
    serviceArea: string;
    hours: string;
    responseTime: string;
  };
  social: {
    instagram: string;
    linkedin: string;
    youtube: string;
    x: string;
    behance: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string;
    siteUrl: string;
  };
  home: {
    heroKicker: string;
    heroTitleLine1: string;
    heroTitleLine2: string;
    heroTitleAccent: string; // highlighted words inside line 2
    heroSubtitle: string;
    heroMeta: string; // "Web Experiences / Visual Content / ..."
    heroMediaMain: string;
    heroMediaSecondary: string;
    ctaPrimary: string;
    ctaSecondary: string;
    marquee: string[];
    introKicker: string;
    introTitle: string;
    introBody: string;
    introPoints: string[];
    webKicker: string;
    webTitle: string;
    webBody: string;
    videoKicker: string;
    videoTitle: string;
    videoBody: string;
    packageKicker: string;
    packageTitle: string;
    packageBody: string;
    packagePrice: string;
    packageFeatures: string[];
    packageCta: string;
    processKicker: string;
    processTitle: string;
    processSteps: { step: string; title: string; body: string }[];
    stats: { value: string; suffix: string; label: string }[];
    ctaTitle: string;
    ctaBody: string;
    ctaButton: string;
  };
  about: {
    ownerName: string;
    role: string;
    portraitUrl: string;
    bio: string;
    approach: string;
    skills: string[];
    tools: string[];
    philosophy: string;
  };
  footer: {
    blurb: string;
    copyright: string;
    note: string;
  };
  pages: {
    privacy: string;
    terms: string;
    notFound: string;
  };
};

export type ServiceFaq = { q: string; a: string };

export type Service = {
  id: string;
  slug: string;
  title: string;
  category: "web" | "video" | "package" | string;
  summary: string;
  description: string;
  deliverables: string[];
  useCases: string[];
  process: string[];
  exclusions: string[];
  faqs: ServiceFaq[];
  startingPrice: string;
  priceNote: string;
  published: boolean;
  order: number;
};

export type ProjectMedia = { url: string; type: "image" | "video"; caption?: string };

export type Project = {
  id: string;
  slug: string;
  title: string;
  client: string;
  category: "Websites" | "Landing Pages" | "Video Editing" | string;
  projectType: "Concept Project" | "Client Project" | string;
  year: string;
  description: string;
  overview: string;
  problem: string;
  objectives: string[];
  designDirection: string;
  solution: string;
  features: string[];
  technologies: string[];
  coverImage: string;
  media: ProjectMedia[];
  liveUrl: string;
  featured: boolean;
  published: boolean;
  showInWork: boolean; // false = hidden from the public Work grid (video-only work lives in the Gallery)
  order: number;
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  published: boolean;
  order: number;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  order: number;
};

export type EnquiryStatus =
  | "NEW"
  | "CONTACTED"
  | "QUALIFIED"
  | "PROPOSAL_SENT"
  | "WON"
  | "LOST";

export const ENQUIRY_STATUSES: EnquiryStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL_SENT",
  "WON",
  "LOST",
];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  PROPOSAL_SENT: "Proposal Sent",
  WON: "Won",
  LOST: "Lost",
};

export type Enquiry = {
  id: string;
  name: string;
  business: string;
  email: string;
  phone: string;
  serviceType: string;
  description: string;
  budget: string;
  timeline: string;
  contactMethod: string;
  status: EnquiryStatus | string;
  notes: string;
  followUpDate: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
};

export type GalleryType = "video" | "photo";

export type GalleryItem = {
  id: string;
  type: GalleryType;
  title: string;
  description: string;
  caption: string;
  category: string;
  mediaPath: string; // storage reference served from /uploads/gallery/…
  posterPath: string; // video poster
  thumbPath: string; // generated photo thumbnail
  altText: string;
  width: number;
  height: number;
  durationSeconds: number;
  clientName: string;
  featured: boolean;
  published: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SiteData = {
  settings: Settings;
  projects: Project[];
  services: Service[];
  faqs: Faq[];
  testimonials: Testimonial[];
  gallery: GalleryItem[]; // published only
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type DashboardStats = {
  enquiries: {
    total: number;
    newCount: number;
    byStatus: Record<string, number>;
  };
  projects: { total: number; published: number; draft: number; featured: number };
  services: { total: number; published: number };
  testimonials: { total: number; published: number };
  faqs: { total: number; published: number };
  recentLeads: Enquiry[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
