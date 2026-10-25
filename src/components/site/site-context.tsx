"use client";

import { createContext, useContext } from "react";
import type { SiteData } from "@/lib/types";

// ---------------------------------------------------------------------------
// Public site data provider — hydrated server-side, shared by every view.
// ---------------------------------------------------------------------------

const SiteContext = createContext<SiteData | null>(null);

export function SiteProvider({ data, children }: { data: SiteData; children: React.ReactNode }) {
  return <SiteContext.Provider value={data}>{children}</SiteContext.Provider>;
}

export function useSite(): SiteData {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("useSite must be used within SiteProvider");
  return ctx;
}

/** WhatsApp deep link with optional pre-filled message. Returns "" when no
 * number is configured so callers can hide the CTA instead of linking to a
 * broken wa.me page. */
export function waLink(number: string, message?: string): string {
  const n = number.replace(/[^0-9]/g, "");
  if (!n) return "";
  const base = `https://wa.me/${n}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
