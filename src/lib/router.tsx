"use client";

import { useCallback, useEffect, useState, type AnchorHTMLAttributes, type ReactNode } from "react";

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

function parseHash(): Route {
  if (typeof window === "undefined") return { path: "", segments: [], query: {} };
  const raw = window.location.hash.replace(/^#/, "");
  const [pathPart, queryPart] = raw.split("?");
  const path = pathPart.replace(/\/+$/, "").replace(/^\//, "");
  const segments = path ? path.split("/") : [];
  const query: Record<string, string> = {};
  if (queryPart) {
    for (const pair of queryPart.split("&")) {
      const [k, v] = pair.split("=");
      if (k) query[decodeURIComponent(k)] = decodeURIComponent(v ?? "");
    }
  }
  return { path, segments, query };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>({ path: "", segments: [], query: {} });

  useEffect(() => {
    const update = () => setRoute(parseHash());
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return route;
}

export function navigate(path: string, opts?: { keepScroll?: boolean }) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (window.location.hash === `#${clean}`) return;
  window.location.hash = clean;
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
