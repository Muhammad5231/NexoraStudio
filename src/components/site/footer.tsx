"use client";

import { ArrowUpRight, Instagram, Linkedin, Youtube, Mail, MapPin, Clock } from "lucide-react";
import { Link } from "@/lib/router";
import { useSite, waLink } from "@/components/site/site-context";
import { Reveal } from "@/components/site/primitives";

// ---------------------------------------------------------------------------
// Footer — sticky-safe (sits at flex column end), editorial, brand-heavy.
// ---------------------------------------------------------------------------

const MessageCircleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-2-1.23-.73-.66-1.23-1.47-1.38-1.72-.14-.24-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.24-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
  </svg>
);

export function Footer() {
  const { settings, services } = useSite();
  const year = new Date().getFullYear();
  const whatsappHref = waLink(
    settings.contact.whatsapp,
    `Hi ${settings.brand.name} — I'd like to discuss a project.`
  );
  // DB-driven service links (max 4) so admin renames/unpublishes never 404;
  // falls back to the services overview when none are published.
  const serviceLinks =
    services.length > 0
      ? services.slice(0, 4).map((s) => ({ href: `/services/${s.slug}`, label: s.title }))
      : [{ href: "/services", label: "All services" }];

  const socials = [
    { href: settings.social.instagram, label: "Instagram", Icon: Instagram },
    { href: settings.social.linkedin, label: "LinkedIn", Icon: Linkedin },
    { href: settings.social.youtube, label: "YouTube", Icon: Youtube },
  ].filter((s) => s.href);

  return (
    <footer className="relative border-t border-ivory/10 bg-[#080809] text-ivory">
      <div className="container-x py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* brand */}
          <div className="lg:col-span-5">
            <Reveal>
              <Link href="/" className="font-display text-3xl font-bold tracking-tight sm:text-4xl" aria-label={`${settings.brand.name} — home`}>
                {settings.brand.name.split(" ")[0]}
                <span className="text-volt">.</span>
              </Link>
              <p className="mt-5 max-w-sm text-sm leading-relaxed text-smoke">{settings.footer.blurb}</p>
              <div className="mt-6 flex items-center gap-3">
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Chat on WhatsApp"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 text-ivory/70 transition-colors hover:border-volt hover:text-volt"
                  >
                    <MessageCircleIcon className="h-[18px] w-[18px]" />
                  </a>
                ) : null}
                <a
                  href={`mailto:${settings.contact.email}`}
                  aria-label="Send an email"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 text-ivory/70 transition-colors hover:border-volt hover:text-volt"
                >
                  <Mail className="h-[18px] w-[18px]" aria-hidden="true" />
                </a>
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ivory/15 text-ivory/70 transition-colors hover:border-volt hover:text-volt"
                  >
                    <s.Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </Reveal>
          </div>

          {/* studio links */}
          <div className="lg:col-span-2">
            <Reveal delay={0.06}>
              <p className="font-display text-xs uppercase tracking-[0.2em] text-ivory/40">Studio</p>
              <ul className="mt-5 space-y-3 text-sm">
                {[
                  { href: "/work", label: "Work" },
                  { href: "/gallery", label: "Gallery" },
                  { href: "/services", label: "Services" },
                  { href: "/about", label: "About" },
                  { href: "/contact", label: "Contact" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-ivory/70 transition-colors hover:text-volt">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* services */}
          <div className="lg:col-span-2">
            <Reveal delay={0.12}>
              <p className="font-display text-xs uppercase tracking-[0.2em] text-ivory/40">Services</p>
              <ul className="mt-5 space-y-3 text-sm">
                {serviceLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-ivory/70 transition-colors hover:text-volt">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* contact */}
          <div className="lg:col-span-3">
            <Reveal delay={0.18}>
              <p className="font-display text-xs uppercase tracking-[0.2em] text-ivory/40">Contact</p>
              <ul className="mt-5 space-y-3 text-sm text-ivory/70">
                <li className="flex items-start gap-2.5">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden="true" />
                  <a href={`mailto:${settings.contact.email}`} className="transition-colors hover:text-volt">
                    {settings.contact.email}
                  </a>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden="true" />
                  <span>{settings.contact.location}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-volt" aria-hidden="true" />
                  <span>{settings.contact.hours}</span>
                </li>
              </ul>
              <Link
                href="/contact"
                className="group mt-6 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-volt"
              >
                Start a project
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
              </Link>
            </Reveal>
          </div>
        </div>

        {/* giant outlined wordmark — pure presentation. Letters spread
            edge-to-edge (justify-between) like an editorial watermark and
            dissolve into the divider via the bottom mask. Fully data-driven:
            rendered from the admin-editable brand name. */}
        <div
          aria-hidden="true"
          className="pointer-events-none mt-14 flex select-none items-baseline justify-between overflow-hidden px-1 font-display text-[clamp(3rem,12.5vw,11.5rem)] font-bold leading-[0.9] tracking-[-0.02em] [mask-image:linear-gradient(to_bottom,black_55%,transparent_96%)] sm:mt-20"
        >
          {(settings.brand.name.split(" ")[0] || "NEXORA")
            .toUpperCase()
            .split("")
            .map((ch, i, arr) => (
              <span key={i} className="wordmark-letter">
                {ch}
                {i === arr.length - 1 ? (
                  <span
                    className="ml-[0.06em] inline-block h-[0.13em] w-[0.13em] rounded-[0.025em] bg-volt shadow-[0_0_28px_rgba(198,255,58,0.45)] [-webkit-text-stroke:0]"
                  />
                ) : null}
              </span>
            ))}
        </div>

        <div className="mt-4 flex flex-col gap-4 border-t border-ivory/10 pt-7 text-xs text-ivory/40 sm:mt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.footer.copyright}
          </p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="transition-colors hover:text-ivory/80">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ivory/80">
              Terms
            </Link>
            <Link href="/admin" className="transition-colors hover:text-ivory/80">
              Admin
            </Link>
          </div>
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-ivory/25">{settings.footer.note}</p>
      </div>
    </footer>
  );
}
