"use client";

import { ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/router";
import { useSite, waLink } from "@/components/site/site-context";
import { CTABanner, PageHeader, Reveal, SectionHead } from "@/components/site/primitives";
import type { Service } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// SERVICES — DB-driven overview grouped by category. One dark section (web),
// one light (video), one dark (package). Cards live in an editorial grid with
// alternating offsets, not a row of identical tiles.
// ---------------------------------------------------------------------------

const GROUP_SPANS = [
  "lg:col-span-7",
  "lg:col-span-5 lg:mt-14",
  "lg:col-span-5",
  "lg:col-span-7 lg:mt-14",
];

function spanFor(index: number, total: number) {
  if (total === 1) return "lg:col-span-12";
  return GROUP_SPANS[index % GROUP_SPANS.length];
}

export default function ServicesView() {
  const { settings, services } = useSite();
  const h = settings.home;

  const groups: {
    key: string;
    kicker: string;
    title: string;
    body: string;
    dark: boolean;
    services: Service[];
  }[] = [
    {
      key: "web",
      kicker: "Web Design & Development",
      title: h.webTitle,
      body: h.webBody,
      dark: true,
      services: services.filter((s) => s.category === "web"),
    },
    {
      key: "video",
      kicker: "Video Editing",
      title: h.videoTitle,
      body: h.videoBody,
      dark: false,
      services: services.filter((s) => s.category === "video"),
    },
    {
      key: "package",
      kicker: "The Bundle",
      title: h.packageTitle,
      body: h.packageBody,
      dark: true,
      services: services.filter((s) => s.category === "package"),
    },
  ];

  const whatsappHref = waLink(
    settings.contact.whatsapp,
    `Hi ${settings.brand.name} — I'm not sure which service I need. Can you advise?`
  );

  return (
    <>
      <PageHeader
        kicker="Services"
        title="Everything a growing business needs online."
        sub="Transparent scopes, fixed prices, honest timelines — pick a starting point and we'll shape the rest together."
        meta="Websites / Video / Bundles"
      />

      {groups
        .filter((g) => g.services.length > 0)
        .map((group, groupIndex) => (
          <section
            key={group.key}
            aria-labelledby={`services-${group.key}-title`}
            className={cn(
              "py-20 sm:py-28",
              group.dark && "grain relative overflow-hidden bg-ink text-ivory",
              !group.dark && "bg-ivory text-ink",
              groupIndex > 0 && group.dark && "border-t border-ivory/10"
            )}
          >
            {group.dark ? (
              <>
                <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
                <div
                  className="absolute right-[-12%] top-0 h-[420px] w-[420px] rounded-full bg-volt/[0.05] blur-[140px]"
                  aria-hidden="true"
                />
              </>
            ) : null}

            <div className="container-x relative z-10">
              <SectionHead
                dark={group.dark}
                kicker={group.kicker}
                title={<span id={`services-${group.key}-title`}>{group.title}</span>}
                body={group.body}
              />

              <div className="mt-12 grid gap-6 lg:grid-cols-12 lg:gap-8">
                {group.services.map((service, i) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    index={i}
                    total={group.services.length}
                    dark={group.dark}
                  />
                ))}
              </div>
            </div>
          </section>
        ))}

      <CTABanner
        title="Not sure which service fits?"
        body="Send a short brief — we'll recommend the smallest scope that gets you there, with honest advice on timeline and budget."
        buttonLabel="Start a Project"
        whatsappHref={whatsappHref}
      />
    </>
  );
}

/* ------------------------------------------------------------ SERVICE CARD */

function ServiceCard({
  service,
  index,
  total,
  dark,
}: {
  service: Service;
  index: number;
  total: number;
  dark: boolean;
}) {
  return (
    <Reveal delay={0.06 * index} className={cn(spanFor(index, total))}>
      <Link
        href={`/services/${service.slug}`}
        ariaLabel={`View details: ${service.title}`}
        className={cn(
          "group flex h-full flex-col rounded-3xl border p-7 transition-colors duration-300 sm:p-9",
          dark
            ? "border-ivory/10 bg-coal/50 hover:border-volt/40"
            : "border-ink/10 bg-white/60 hover:border-ink/30"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <span
            className={cn(
              "font-display text-sm font-semibold",
              dark ? "text-volt" : "text-ink/35"
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          {service.startingPrice ? (
            <span
              className={cn(
                "whitespace-nowrap rounded-full border px-3.5 py-1.5 font-display text-xs font-semibold",
                dark ? "border-ivory/15 text-ivory/70" : "border-ink/15 text-ink/70"
              )}
            >
              {service.startingPrice}
            </span>
          ) : null}
        </div>

        <h3
          className={cn(
            "mt-6 font-display text-2xl font-bold tracking-tight transition-colors sm:text-[1.7rem]",
            dark ? "text-ivory group-hover:text-volt" : "text-ink group-hover:text-ink/70"
          )}
        >
          {service.title}
        </h3>
        <p
          className={cn(
            "mt-3 text-[15px] leading-relaxed",
            dark ? "text-smoke" : "text-graphite"
          )}
        >
          {service.summary}
        </p>

        <span
          className={cn(
            "mt-auto inline-flex items-center gap-1.5 pt-7 font-display text-xs font-semibold uppercase tracking-[0.16em] transition-colors",
            dark ? "text-ivory/60 group-hover:text-volt" : "text-ink/50 group-hover:text-ink"
          )}
        >
          View details
          <ArrowUpRight
            className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </Link>
    </Reveal>
  );
}
