"use client";

import { Suspense, lazy, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SiteProvider } from "@/components/site/site-context";
import { Nav } from "@/components/site/nav";
import { Footer } from "@/components/site/footer";
import { HomeView } from "@/components/site/views/home";
import { useRoute } from "@/lib/router";
import { api } from "@/lib/api-client";
import type { SiteData } from "@/lib/types";

// ---------------------------------------------------------------------------
// SiteShell — client router for the whole site. Public views share nav+footer;
// the admin panel renders its own full-screen app (code-split + lazy).
// ---------------------------------------------------------------------------

const ServicesView = lazy(() => import("@/components/site/views/services"));
const ServiceDetailView = lazy(() => import("@/components/site/views/service-detail"));
const WorkView = lazy(() => import("@/components/site/views/work"));
const GalleryView = lazy(() => import("@/components/site/views/gallery"));
const CaseStudyView = lazy(() => import("@/components/site/views/case-study"));
const AboutView = lazy(() => import("@/components/site/views/about"));
const ContactView = lazy(() => import("@/components/site/views/contact"));
const LegalView = lazy(() => import("@/components/site/views/legal"));
const NotFoundView = lazy(() => import("@/components/site/views/not-found"));
const AdminApp = lazy(() => import("@/components/admin/admin-app"));

function ViewSkeleton() {
  return (
    <div className="min-h-screen bg-ink" role="status" aria-label="Loading">
      <div className="container-x pt-40">
        <div className="h-3 w-28 animate-pulse rounded bg-ivory/10" />
        <div className="mt-8 h-16 w-3/4 animate-pulse rounded bg-ivory/10" />
        <div className="mt-4 h-16 w-1/2 animate-pulse rounded bg-ivory/10" />
      </div>
    </div>
  );
}

const TITLES: Record<string, string> = {
  "": "Websites & Video Content for Growing Businesses",
  work: "Our Work",
  gallery: "Gallery — Videos & Photography",
  services: "Services",
  about: "About the Studio",
  contact: "Start a Project",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  admin: "Admin",
};

export function SiteShell({ initial }: { initial: SiteData }) {
  const route = useRoute();
  const reduce = useReducedMotion();
  const isAdmin = route.segments[0] === "admin";
  // hydration-safe flag: false during SSR + first client render, true after
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  // reset scroll on any path change (covers links, back/forward, manual hash)
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [route.path]);

  // content freshness: when leaving the admin panel, refetch public content
  // so edits made in the dashboard are visible without a manual reload
  const [content, setContent] = useState(initial);
  const prevPath = useRef("");
  useEffect(() => {
    const cameFromAdmin = prevPath.current.startsWith("admin");
    prevPath.current = route.path;
    if (cameFromAdmin && route.segments[0] !== "admin") {
      api<SiteData>("api/content")
        .then(setContent)
        .catch(() => undefined);
    }
  }, [route.path]);

  // document title + admin noindex
  useEffect(() => {
    const base = content.settings.brand.name || "Nexora Studio";
    const seg0 = route.segments[0] ?? "";
    if (seg0 === "work" && route.segments[1]) {
      const p = content.projects.find((x) => x.slug === route.segments[1]);
      // unknown slug renders the 404 view — title should say so
      document.title = p ? `${p.title} · Case Study` : `Page not found · ${base}`;
    } else if (seg0 === "services" && route.segments[1]) {
      const s = content.services.find((x) => x.slug === route.segments[1]);
      document.title = s ? `${s.title} · Services` : `Page not found · ${base}`;
    } else {
      document.title = TITLES[seg0] ? `${TITLES[seg0]} · ${base}` : `Page not found · ${base}`;
    }

    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = isAdmin ? "noindex, nofollow" : "index, follow";
  }, [route, content, isAdmin]);

  if (isAdmin) {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <AdminApp route={route} brandName={content.settings.brand.name} />
      </Suspense>
    );
  }

  const seg0 = route.segments[0] ?? "";
  let view: React.ReactNode;

  switch (seg0) {
    case "":
      view = <HomeView />;
      break;
    case "services":
      view = route.segments[1] ? <ServiceDetailView slug={route.segments[1]} /> : <ServicesView />;
      break;
    case "work":
      view = route.segments[1] ? <CaseStudyView slug={route.segments[1]} /> : <WorkView />;
      break;
    case "gallery":
      view = <GalleryView />;
      break;
    case "about":
      view = <AboutView />;
      break;
    case "contact":
      view = <ContactView />;
      break;
    case "privacy":
      view = <LegalView kind="privacy" />;
      break;
    case "terms":
      view = <LegalView kind="terms" />;
      break;
    default:
      view = <NotFoundView />;
  }

  return (
    <SiteProvider data={content}>
      <div className="flex min-h-screen flex-col bg-ink text-ivory">
        <Nav />
        <main className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={route.path || "home"}
              initial={mounted && !reduce ? { opacity: 0, y: 14 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={mounted && !reduce ? { opacity: 0, y: -10 } : undefined}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <Suspense fallback={<ViewSkeleton />}>{view}</Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </SiteProvider>
  );
}
