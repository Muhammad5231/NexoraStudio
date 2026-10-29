"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Menu, X, Instagram, Linkedin, Youtube, Globe } from "lucide-react";
import { Link, useRoute } from "@/lib/router";
import { useSite, waLink } from "@/components/site/site-context";
import { EASE } from "@/components/site/primitives";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Fixed navigation with scroll-aware backdrop + cinematic full-screen mobile
// menu. Hidden on admin routes (SiteShell handles that).
// ---------------------------------------------------------------------------

const NAV_LINKS = [
  { href: "/work", label: "Work" },
  { href: "/gallery", label: "Gallery" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function BrandMark({ className, dark = true }: { className?: string; dark?: boolean }) {
  const { settings } = useSite();
  const name = settings.brand.name.split(" ")[0] || "NEXORA";
  return (
    <span className={cn("inline-flex items-baseline gap-1", className)} aria-label={settings.brand.name}>
      <span className={cn("font-display text-lg font-bold tracking-tight", dark ? "text-ivory" : "text-ink")}>{name}</span>
      <span className="inline-block h-2 w-2 translate-y-[-1px] rounded-[2px] bg-volt" aria-hidden="true" />
    </span>
  );
}

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const route = useRoute();
  const { settings } = useSite();
  const isHome = route.path === "";
  const burgerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const whatsappHref = waLink(settings.contact.whatsapp);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // lock body scroll when the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // any route change (menu link, browser back/forward) closes the menu —
  // "adjust state during render" pattern, no effect needed
  const [seenPath, setSeenPath] = useState(route.path);
  if (seenPath !== route.path) {
    setSeenPath(route.path);
    setOpen(false);
  }

  // dialog semantics: Escape closes, focus moves in on open and back to the
  // hamburger on close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      burgerRef.current?.focus();
    };
  }, [open]);

  const socials = [
    { href: settings.social.instagram, label: "Instagram", Icon: Instagram },
    { href: settings.social.linkedin, label: "LinkedIn", Icon: Linkedin },
    { href: settings.social.youtube, label: "YouTube", Icon: Youtube },
  ].filter((s) => s.href);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          scrolled || !isHome ? "border-b border-ivory/10 bg-ink/85 backdrop-blur-xl" : "bg-transparent"
        )}
      >
        <nav className="container-x flex h-[72px] items-center justify-between" aria-label="Main">
          <Link href="/" className="flex items-center">
            <BrandMark />
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              const active = route.path === link.href.slice(1) || (link.href !== "/" && route.path.startsWith(link.href.slice(1) + "/"));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  data-active={active}
                  className={cn(
                    "link-sweep font-display text-[13px] font-medium uppercase tracking-[0.16em] transition-colors",
                    active ? "text-volt" : "text-ivory/70 hover:text-ivory"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/contact"
              className="group inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-volt px-5 py-2 font-display text-[13px] font-semibold text-ink transition-colors hover:bg-volt-2"
            >
              Start a Project
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </Link>
          </div>

          <button
            ref={burgerRef}
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 text-ivory transition-colors hover:border-ivory/40 md:hidden"
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </nav>
      </header>

      {/* ------------------------------------------------ mobile menu */}
      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col bg-ink"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
            <div className="container-x relative z-10 flex h-[72px] items-center justify-between">
              <BrandMark />
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 text-ivory"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="container-x relative z-10 mt-10 flex max-h-[calc(100vh-72px)] flex-1 flex-col justify-between gap-10 overflow-y-auto pb-10">
              <nav aria-label="Mobile">
                <ul className="space-y-2">
                  {NAV_LINKS.map((link, i) => (
                    <li key={link.href} className="overflow-hidden">
                      <motion.div
                        initial={{ y: "110%" }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.7, delay: 0.08 + i * 0.07, ease: EASE }}
                      >
                        <Link
                          href={link.href}
                          onClick={() => setOpen(false)}
                          className="group flex items-center justify-between py-3 font-display text-4xl font-bold tracking-tight text-ivory active:text-volt sm:text-5xl"
                        >
                          {link.label}
                          <ArrowUpRight className="h-7 w-7 text-volt opacity-0 transition-opacity group-active:opacity-100" aria-hidden="true" />
                        </Link>
                      </motion.div>
                    </li>
                  ))}
                </ul>
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className="mt-8"
                >
                  <Link
                    href="/contact"
                    onClick={() => setOpen(false)}
                    className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-volt px-7 py-3 font-display text-base font-semibold text-ink"
                  >
                    Start a Project
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </motion.div>
              </nav>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="space-y-4 border-t border-ivory/10 pt-6"
              >
                <p className="font-display text-xs uppercase tracking-[0.2em] text-ivory/40">{settings.brand.tagline}</p>
                <div className="flex flex-wrap items-center gap-5">
                  <a href={`mailto:${settings.contact.email}`} className="text-sm text-ivory/70">
                    {settings.contact.email}
                  </a>
                  {whatsappHref ? (
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="text-sm text-ivory/70">
                      WhatsApp
                    </a>
                  ) : null}
                  {socials.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="text-ivory/70">
                      <s.Icon className="h-4.5 w-4.5" aria-hidden="true" />
                    </a>
                  ))}
                  {socials.length === 0 ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-ivory/40">
                      <Globe className="h-4 w-4" aria-hidden="true" /> India
                    </span>
                  ) : null}
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
