"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/router";
import { useSite, waLink } from "@/components/site/site-context";
import { CTABanner, MediaFrame, PageHeader, Reveal } from "@/components/site/primitives";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// WORK — filterable portfolio grid. Sticky filter bar under the fixed nav,
// editorial 12-col grid with varied spans/offsets (same rhythm as home).
// ---------------------------------------------------------------------------

const SPANS = [
  "lg:col-span-7",
  "lg:col-span-5 lg:mt-20",
  "lg:col-span-5 lg:-mt-10",
  "lg:col-span-7 lg:mt-4",
];
const RATIOS = ["16/10", "4/3.4", "4/3.4", "16/10"];

const CATEGORY_FILTERS = ["Websites", "Landing Pages", "Video Editing"];

export default function WorkView() {
  const { settings, projects } = useSite();
  const [filter, setFilter] = useState<string>("All");

  const categories = CATEGORY_FILTERS.filter((c) => projects.some((p) => p.category === c));
  const filters = ["All", ...categories, "Featured"];

  const visible = projects.filter((p) => {
    if (filter === "All") return true;
    if (filter === "Featured") return p.featured;
    return p.category === filter;
  });

  const whatsappHref = waLink(
    settings.contact.whatsapp,
    `Hi ${settings.brand.name} — I saw your work and want something like it.`
  );

  return (
    <>
      <PageHeader
        kicker="Our Work"
        title="Projects with proof of craft."
        sub="Every sample below is clearly labelled — Concept Projects are self-initiated demos until replaced with client work."
        meta="Websites / Landing Pages / Video Editing / Featured"
      />

      {/* -------------------------------------------------- sticky filter bar */}
      <div
        className="sticky top-[72px] z-30 border-b border-ivory/10 bg-ink/85 backdrop-blur-xl"
        role="group"
        aria-label="Filter projects"
      >
        <div className="container-x flex items-center gap-2 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={active}
                className={cn(
                  "inline-flex min-h-[44px] shrink-0 items-center rounded-full px-5 font-display text-[13px] font-medium uppercase tracking-[0.12em] transition-colors duration-300",
                  active
                    ? "bg-volt text-ink"
                    : "border border-ivory/15 text-ivory/60 hover:border-ivory/40 hover:text-ivory"
                )}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* -------------------------------------------------------- grid (dark) */}
      <section className="bg-ink py-20 text-ivory sm:py-28" aria-label="Project grid">
        <div className="container-x">
          <p className="font-display text-xs uppercase tracking-[0.2em] text-ivory/40" aria-live="polite">
            Showing {visible.length} project{visible.length === 1 ? "" : "s"}
            {filter !== "All" ? ` · ${filter}` : ""}
          </p>

          {visible.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-ivory/15 px-6 py-20 text-center sm:py-24">
              <p className="display-3 text-ivory/80">Nothing here yet.</p>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-smoke">
                Try another filter — or be the first case study in this category.
              </p>
              <button
                type="button"
                onClick={() => setFilter("All")}
                className="mt-9 inline-flex min-h-[44px] items-center rounded-full border border-ivory/25 px-6 py-3 font-display text-sm font-semibold text-ivory transition-colors hover:border-ivory/60"
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:gap-8">
              {visible.map((project, i) => (
                <Reveal
                  key={project.id}
                  delay={0.05 * (i % 4)}
                  className={cn(visible.length === 1 ? "lg:col-span-12" : SPANS[i % SPANS.length])}
                >
                  <Link
                    href={`/work/${project.slug}`}
                    className="group block"
                    ariaLabel={`View case study: ${project.title}`}
                  >
                    <MediaFrame
                      src={project.coverImage || "/media/hero-main.png"}
                      alt={`${project.title} — ${project.category}`}
                      ratio={RATIOS[i % RATIOS.length]}
                      className="rounded-2xl border border-ivory/10"
                    >
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                        aria-hidden="true"
                      />
                      <span className="absolute right-4 top-4 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-volt opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                        <ArrowUpRight className="h-5 w-5 text-ink" aria-hidden="true" />
                      </span>
                      {project.projectType !== "Client Project" ? (
                        <span className="absolute left-4 top-4 rounded-full border border-ivory/20 bg-ink/70 px-3 py-1 font-display text-[10px] font-medium uppercase tracking-[0.16em] text-ivory/80 backdrop-blur-sm">
                          {project.projectType}
                        </span>
                      ) : null}
                    </MediaFrame>

                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-display text-xl font-bold tracking-tight text-ivory transition-colors group-hover:text-volt sm:text-2xl">
                          {project.title}
                        </h2>
                        <p className="mt-1.5 line-clamp-1 text-sm text-smoke">{project.description}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-[11px] uppercase tracking-[0.16em] text-volt">
                          {project.category}
                        </p>
                        <p className="mt-1 font-display text-[11px] uppercase tracking-[0.16em] text-ivory/35">
                          {project.year}
                        </p>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <CTABanner
        title="Your project could be next."
        body={settings.home.ctaBody}
        buttonLabel={settings.home.ctaButton}
        whatsappHref={whatsappHref}
      />
    </>
  );
}
