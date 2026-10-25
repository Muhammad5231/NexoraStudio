// ---------------------------------------------------------------------------
// Admin-only helpers: slugs, dates, links, password rules. Pure functions.
// ---------------------------------------------------------------------------

import type { Enquiry, EnquiryStatus } from "@/lib/types";

/** URL-safe slug: lowercase, accents folded, non-alphanumerics → dashes. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export const SLUG_RE = /^[a-z0-9-]+$/;
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "just now" / "5m ago" / "3h ago" / "2d ago" / fallback date. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return formatDate(iso);
}

/** Canonical WhatsApp deep link from a raw phone string. */
export function waLink(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`; // assume India local format
  return `https://wa.me/${digits}`;
}

/** Heuristic: treat these as embeddable video URLs. */
export function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url) || url.startsWith("video:");
}

export function excerpt(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

/** Tailwind classes per enquiry status — color-coded per design spec. */
export function statusBadgeClass(status: EnquiryStatus | string): string {
  switch (status) {
    case "NEW":
      return "bg-volt text-ink border-transparent";
    case "CONTACTED":
      return "bg-white text-ink border-ink/20";
    case "QUALIFIED":
      return "bg-white text-ink border-amber-400/60";
    case "PROPOSAL_SENT":
      return "bg-white text-ink border-ink/40";
    case "WON":
      return "bg-ink text-ivory border-transparent";
    case "LOST":
      return "bg-ink/5 text-graphite border-transparent line-through decoration-ink/30";
    default:
      return "bg-white text-graphite border-ink/15";
  }
}

/** Small colored dot used inside status pills. */
export function statusDotClass(status: EnquiryStatus | string): string {
  switch (status) {
    case "NEW":
      return "bg-ink";
    case "CONTACTED":
      return "bg-smoke";
    case "QUALIFIED":
      return "bg-amber-500";
    case "PROPOSAL_SENT":
      return "bg-ink";
    case "WON":
      return "bg-volt";
    default:
      return "bg-ink/30";
  }
}

export const CATEGORY_CLASS: Record<string, string> = {
  Websites: "bg-ink text-ivory",
  "Landing Pages": "bg-volt text-ink",
  "Video Editing": "bg-ivory-2 text-ink",
  web: "bg-ink text-ivory",
  video: "bg-volt text-ink",
  package: "bg-ivory-2 text-ink",
};

/** Merge an enquiry PATCH response into a cached list. */
export function patchInList(list: Enquiry[], updated: Enquiry): Enquiry[] {
  return list.map((e) => (e.id === updated.id ? updated : e));
}

export function clampPage(page: number, total: number, pageSize: number): number {
  const max = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), max);
}
