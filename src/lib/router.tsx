"use client";

import { useSyncExternalStore, type AnchorHTMLAttributes, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// Hash router — the sandbox exposes a single route (/), so the entire site
// (public pages + admin panel) runs as views inside one hash-routed SPA.
// URLs look like: #/work, #/work/some-slug, #/admin/leads
// ---------------------------------------------------------------------------

export type Route = {
  path: string; // e.g. "work/some-slug"
  segments: string[]; // ["work", "some-slug"]
  query: Record<string, string>;
};

const EMPTY_ROUTE: Route = { path: "", segments: [], query: {} };

/** decodeURIComponent that never throws on malformed escapes (e.g. "%"). */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseHash(): Route {
  if (typeof window === "undefined") return EMPTY_ROUTE;
  const raw = window.location.hash.replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.replace(/\/+$/, "").replace(/^\//, "");
  const segments = path ? path.split("/") : [];
  const query: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      const [k, v] = pair.split("=");
      if (k) query[safeDecode(k)] = safeDecode(v ?? "");
    }
  }
  return { path, segments, query };
}

// External-store pattern (hydration-safe): the server snapshot is always the
// empty route; after hydration React immediately re-reads the client snapshot,
// so deep links like #/work/foo resolve on the first client paint instead of
// flashing the home view. getSnapshot is cached to keep referential stability.
const listeners = new Set<() => void>();
let cache: Route | null = null;

function getSnapshot(): Route {
  if (cache === null) cache = parseHash();
  return cache;
}

function subscribe(listener: () => void): () => void {
  const onHashChange = () => {
    cache = parseHash();
    listener();
  };
  window.addEventListener("hashchange", onHashChange);
  return () => window.removeEventListener("hashchange", onHashChange);
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_ROUTE);
}

export function navigate(path: string, opts?: { keepScroll?: boolean; replace?: boolean }) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (window.location.hash === `#${clean}`) return;

  if (opts?.replace) {
    // replaceState doesn't fire hashchange — refresh cache + notify manually
    // (used after create → :id so Back never returns to a dead /new route).
    history.replaceState(null, "", `#${clean}`);
    cache = parseHash();
    for (const listener of listeners) listener();
  } else {
    window.location.hash = clean;
  }

  if (!opts?.keepScroll) {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }
}

/* --------------------------------------------------------------------- Link */
type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  ariaLabel?: string;
};

export function Link({ href, children, ariaLabel, ...rest }: LinkProps) {
  const target = href.startsWith("/") ? `#${href}` : href;
  return (
    <a href={target} aria-label={ariaLabel} {...rest}>
      {children}
    </a>
  );
}
