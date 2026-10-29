import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas — every API mutation validates input server-side through these.
// ---------------------------------------------------------------------------

const phoneish = z
  .string()
  .trim()
  .max(20)
  .regex(/^[0-9+\-\s()]*$/, "Invalid phone number")
  .optional()
  .or(z.literal(""));

export const enquirySchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(80),
  business: z.string().trim().max(120).optional().or(z.literal("")),
  email: z.email("Please enter a valid email").max(160),
  phone: phoneish,
  serviceType: z.string().trim().min(1, "Select a service").max(120),
  description: z
    .string()
    .trim()
    .min(20, "Tell us a little more (min 20 characters)")
    .max(3000),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  timeline: z.string().trim().max(60).optional().or(z.literal("")),
  contactMethod: z.enum(["WhatsApp", "Email", "Phone call"]).default("WhatsApp"),
});

export type EnquiryInput = z.infer<typeof enquirySchema>;

export const enquiryPatchSchema = z.object({
  status: z
    .enum(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON", "LOST"])
    .optional(),
  notes: z.string().max(5000).optional(),
  followUpDate: z.string().datetime().nullable().optional(),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email").max(160),
  password: z.string().min(1, "Enter your password").max(200),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8, "Minimum 8 characters").max(200),
});

export const mediaItemSchema = z.object({
  url: z.string().trim().min(1).max(600),
  type: z.enum(["image", "video"]).default("image"),
  caption: z.string().max(200).optional().or(z.literal("")),
});

export const projectSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  title: z.string().trim().min(2).max(120),
  client: z.string().trim().max(120).optional().or(z.literal("")),
  category: z.enum(["Websites", "Landing Pages", "Video Editing"]),
  showInWork: z.boolean().optional(), // false = hidden from the public Work grid (video-only work lives in the Gallery)
  projectType: z.enum(["Concept Project", "Client Project"]),
  year: z.string().trim().max(10).optional().or(z.literal("")),
  description: z.string().trim().max(400).optional().or(z.literal("")),
  overview: z.string().trim().max(4000).optional().or(z.literal("")),
  problem: z.string().trim().max(2000).optional().or(z.literal("")),
  objectives: z.array(z.string().trim().max(300)).max(10).optional(),
  designDirection: z.string().trim().max(2000).optional().or(z.literal("")),
  solution: z.string().trim().max(2000).optional().or(z.literal("")),
  features: z.array(z.string().trim().max(200)).max(12).optional(),
  technologies: z.array(z.string().trim().max(60)).max(15).optional(),
  coverImage: z.string().trim().max(600).optional().or(z.literal("")),
  media: z.array(mediaItemSchema).max(20).optional(),
  liveUrl: z.string().trim().max(400).optional().or(z.literal("")),
  showLiveUrl: z.boolean().optional(),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  order: z.number().int().min(0).max(999).optional(),
});

export const serviceSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers and dashes only"),
  title: z.string().trim().min(2).max(120),
  category: z.enum(["web", "video", "package"]),
  summary: z.string().trim().max(300).optional().or(z.literal("")),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  deliverables: z.array(z.string().trim().max(200)).max(15).optional(),
  useCases: z.array(z.string().trim().max(200)).max(10).optional(),
  process: z.array(z.string().trim().max(200)).max(10).optional(),
  exclusions: z.array(z.string().trim().max(200)).max(10).optional(),
  faqs: z
    .array(z.object({ q: z.string().trim().max(300), a: z.string().trim().max(1500) }))
    .max(10)
    .optional(),
  startingPrice: z.string().trim().max(60).optional().or(z.literal("")),
  priceNote: z.string().trim().max(120).optional().or(z.literal("")),
  published: z.boolean().optional(),
  order: z.number().int().min(0).max(999).optional(),
});

export const testimonialSchema = z.object({
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  quote: z.string().trim().min(10).max(1000),
  rating: z.number().int().min(1).max(5).optional(),
  published: z.boolean().optional(),
  order: z.number().int().min(0).max(999).optional(),
});

export const faqSchema = z.object({
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(2000),
  published: z.boolean().optional(),
  order: z.number().int().min(0).max(999).optional(),
});

export const settingsSectionSchema = z.object({
  section: z.enum(["brand", "contact", "social", "seo", "home", "about", "footer", "pages"]),
  data: z.record(z.string(), z.unknown()),
});

// ---------------------------------------------------------------------------
// Gallery media. mediaPath/posterPath/thumbPath must be server-issued storage
// references produced by /api/admin/gallery/upload — they are re-validated on
// the server against the gallery storage root before anything is persisted.
// ---------------------------------------------------------------------------

export const galleryItemSchema = z.object({
  type: z.enum(["video", "photo"]),
  title: z.string().trim().min(2, "Enter a title (min 2 characters)").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  caption: z.string().trim().max(300).optional().or(z.literal("")),
  category: z.string().trim().max(60).optional().or(z.literal("")),
  mediaPath: z.string().trim().min(1, "Upload the media file first").max(400),
  posterPath: z.string().trim().max(400).optional().or(z.literal("")),
  thumbPath: z.string().trim().max(400).optional().or(z.literal("")),
  altText: z.string().trim().max(300).optional().or(z.literal("")),
  width: z.number().int().min(0).max(20000).optional(),
  height: z.number().int().min(0).max(20000).optional(),
  durationSeconds: z.number().int().min(0).max(36000).optional(),
  clientName: z.string().trim().max(120).optional().or(z.literal("")),
  featured: z.boolean().optional(),
  published: z.boolean().optional(),
  displayOrder: z.number().int().min(0).max(999).optional(),
});

export const galleryReorderSchema = z.object({
  type: z.enum(["video", "photo"]),
  ids: z.array(z.string().min(1).max(64)).min(1).max(50),
});
