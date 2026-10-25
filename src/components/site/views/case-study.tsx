"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/lib/router";
import { useSite, waLink } from "@/components/site/site-context";
import {
  CTABanner,
  Chip,
  MediaFrame,
  Multiline,
  ParallaxImg,
  Reveal,
  SectionHead,
  VoltButton,
} from "@/components/site/primitives";
import NotFoundView from "./not-found";
import type { ReactNode } from "react";
import type { ProjectMedia } from "@/lib/types";

// ---------------------------------------------------------------------------
// CASE STUDY — cinematic hero, meta strip, sticky facts rail, editorial body,
// gallery and a next-project hand-off. Unknown slugs fall back to 404.
// ---------------------------------------------------------------------------

export default function CaseStudyView({ slug }: { slug: string }) {
  const { settings, projects } = useSite();
  const project = projects.find((p) => p.slug === slug);

  if (!project) return <NotFoundView />;

  const cover = project.coverImage || "/media/hero-main.png";
  const index = projects.findIndex((p) => p.id === project.id);
  // "Next project" only makes sense with more than one published project
  const next = projects.length > 1 ? projects[(index + 1) % projects.length] : null;

  const gallery: ProjectMedia[] =
    project.media.length > 0
      ? project.media
      : [{ url: cover, type: "image", caption: `${project.title} — cover visual` }];

  const whatsappHref = waLink(
    settings.contact.whatsapp,
    `Hi ${settings.brand.name} — I just read the ${project.title} case study and want results like it.`
  );

  return (
    <>
      {/* ------------------------------------------------------- cinematic hero */}
      <section className="grain relative overflow-hidden bg-ink pt-32 sm:pt-40" aria-label={project.title}>
        <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
        <div
          className="absolute right-[-10%] top-0 h-[420px] w-[420px] rounded-full bg-volt/[0.06] blur-[150px]"
          aria-hidden="true"
        />

        <div className="container-x relative z-10">
          <Reveal>
            <Link
              href="/work"
              className="group inline-flex items-center gap-2 text-sm text-ivory/60 transition-colors hover:text-volt"
            >
              <ArrowRight className="h-4 w-4 rotate-180 transition-transform duration-300 group-hover:-translate-x-1" aria-hidden="true" />
              All work
            </Link>
          </Reveal>
          <Reveal>
            <p className="kicker mt-8 flex items-center gap-2.5 text-volt">
              <span className="inline-block h-px w-8 bg-volt" aria-hidden="true" />
              {project.category} · {project.year || "—"}
            </p>
          </Reveal>
          <h1 className="mt-6">
            <Reveal delay={0.1}>
              <span className="display-1 block max-w-4xl text-ivory">{project.title}</span>
            </Reveal>
          </h1>
          <Reveal delay={0.2} className="mt-7 flex flex-wrap items-center gap-3">
            {project.projectType !== "Client Project" ? (
              <Chip className="border-volt/30 text-volt">{project.projectType}</Chip>
            ) : (
              <Chip>Client Project</Chip>
            )}
            {project.featured ? <Chip className="border-volt/30 text-volt">Featured</Chip> : null}
            {project.client ? <span className="text-sm text-smoke">for {project.client}</span> : null}
          </Reveal>
        </div>

        {/* full-bleed cinematic cover */}
        <Reveal delay={0.15} className="relative z-10 mt-12 sm:mt-16">
          <ParallaxImg
            src={cover}
            alt={`${project.title} — project cover`}
            className="aspect-[16/8] w-full"
            priority
            distance={56}
          />
        </Reveal>
      </section>

      {/* ----------------------------------------------------------- meta strip */}
      <section className="border-y border-ivory/10 bg-ink-2" aria-label="Project facts at a glance">
        <div className="container-x grid grid-cols-2 gap-x-8 gap-y-7 py-9 lg:grid-cols-4">
          {[
            { label: "Client", value: project.client || "—" },
            { label: "Category", value: project.category },
            { label: "Year", value: project.year || "—" },
            { label: "Tools", value: project.technologies.slice(0, 3).join(" · ") || "—" },
          ].map((item) => (
            <Reveal key={item.label}>
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.2em] text-ivory/40">
                {item.label}
              </p>
              <p className="mt-2.5 font-display text-sm text-ivory sm:text-base">{item.value}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- body (ivory) */}
      <section className="bg-ivory py-20 text-ink sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          {/* sticky facts rail */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28">
              <Reveal>
                <div className="rounded-3xl border border-ink/10 bg-white/70 p-7">
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
                    Project facts
                  </p>
                  <dl className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
                    {[
                      { label: "Client", value: project.client || "—" },
                      { label: "Year", value: project.year || "—" },
                      { label: "Category", value: project.category },
                    ].map((fact) => (
                      <div key={fact.label} className="flex items-center justify-between gap-4 py-3.5">
                        <dt className="text-sm text-graphite">{fact.label}</dt>
                        <dd className="text-right text-sm font-medium text-ink">{fact.value}</dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-4 py-3.5">
                      <dt className="text-sm text-graphite">Type</dt>
                      <dd>
                        <Chip dark={false} className="border-ink/15">
                          {project.projectType}
                        </Chip>
                      </dd>
                    </div>
                  </dl>

                  {project.technologies.length > 0 ? (
                    <div className="mt-6">
                      <p className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/45">
                        Built with
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {project.technologies.map((tech) => (
                          <Chip key={tech} dark={false}>
                            {tech}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {project.liveUrl ? (
                    <VoltButton href={project.liveUrl} variant="outline-dark" external className="mt-8 w-full justify-center">
                      Visit live site
                    </VoltButton>
                  ) : null}
                </div>
              </Reveal>
            </div>
          </aside>

          {/* editorial narrative */}
          <div className="lg:col-span-8">
            {project.overview ? (
              <CaseSection heading="Overview">
                <p className="text-lg leading-relaxed text-ink sm:text-xl">
                  <Multiline text={project.overview} />
                </p>
              </CaseSection>
            ) : null}

            {project.problem ? (
              <CaseSection heading="The Problem">
                <p className="text-[15px] leading-relaxed text-graphite sm:text-base">
                  <Multiline text={project.problem} />
                </p>
              </CaseSection>
            ) : null}

            {project.objectives.length > 0 ? (
              <CaseSection heading="Objectives">
                <ul className="divide-y divide-ink/10 border-y border-ink/10">
                  {project.objectives.map((objective) => (
                    <li key={objective} className="flex items-start gap-3.5 py-4">
                      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-volt-2" aria-hidden="true" />
                      <span className="text-[15px] leading-relaxed text-ink/85">{objective}</span>
                    </li>
                  ))}
                </ul>
              </CaseSection>
            ) : null}

            {project.designDirection ? (
              <CaseSection heading="Design Direction">
                <p className="text-[15px] leading-relaxed text-graphite sm:text-base">
                  <Multiline text={project.designDirection} />
                </p>
              </CaseSection>
            ) : null}

            {project.solution ? (
              <CaseSection heading="The Solution">
                <p className="text-[15px] leading-relaxed text-graphite sm:text-base">
                  <Multiline text={project.solution} />
                </p>
              </CaseSection>
            ) : null}

            {project.features.length > 0 ? (
              <CaseSection heading="Features">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {project.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white/50 px-4 py-3.5"
                    >
                      <ArrowRight className="h-4 w-4 shrink-0 text-ink/40" aria-hidden="true" />
                      <span className="text-sm font-medium leading-snug">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CaseSection>
            ) : null}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- gallery */}
      <section className="bg-ivory-2 py-20 text-ink sm:py-28" aria-label="Project gallery">
        <div className="container-x">
          <SectionHead dark={false} kicker="Gallery" title="Inside the build." />
          <div className="mt-12 space-y-10 sm:space-y-14">
            {gallery.map((item, i) =>
              item.type === "video" ? (
                <Reveal key={`${item.url}-${i}`} delay={0.04 * (i % 4)}>
                  <video
                    src={item.url}
                    controls
                    preload="metadata"
                    playsInline
                    poster={project.coverImage || undefined}
                    className="w-full rounded-2xl border border-ink/10 bg-ink"
                    aria-label={item.caption || `${project.title} — video`}
                  />
                  {item.caption ? <p className="mt-3 text-sm text-graphite">{item.caption}</p> : null}
                </Reveal>
              ) : (
                <Reveal key={`${item.url}-${i}`} delay={0.04 * (i % 4)}>
                  <MediaFrame
                    src={item.url || cover}
                    alt={item.caption || `${project.title} — image ${i + 1}`}
                    ratio={i % 2 === 0 ? "16/9" : "4/3"}
                    className="rounded-2xl border border-ink/10"
                  />
                  {item.caption ? <p className="mt-3 text-sm text-graphite">{item.caption}</p> : null}
                </Reveal>
              )
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- next project */}
      {next ? (
        <section className="bg-ink py-20 text-ivory sm:py-28" aria-label="Next project">
          <div className="container-x">
            <Reveal>
              <p className="kicker text-volt">Next Project</p>
            </Reveal>
            <Reveal delay={0.08}>
              <Link
                href={`/work/${next.slug}`}
                className="group mt-8 flex items-center justify-between gap-6 border-t border-ivory/10 pt-10"
                ariaLabel={`Next project: ${next.title}`}
              >
                <h2 className="display-2 text-ivory transition-colors duration-300 group-hover:text-volt">
                  {next.title}
                </h2>
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-ivory/15 transition-colors duration-300 group-hover:border-volt group-hover:bg-volt sm:h-20 sm:w-20"
                  aria-hidden="true"
                >
                  <ArrowRight className="h-6 w-6 text-ivory transition-all duration-300 group-hover:translate-x-1 group-hover:text-ink sm:h-8 sm:w-8" />
                </span>
              </Link>
            </Reveal>
          </div>
        </section>
      ) : null}

      <CTABanner
        title="Let's build yours next."
        body="Want results like this for your business?"
        buttonLabel={settings.home.ctaButton}
        whatsappHref={whatsappHref}
      />
    </>
  );
}

/* ----------------------------------------------------------- CASE SECTION */

function CaseSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mt-12 first:mt-0">
      <Reveal>
        <h3 className="flex items-center gap-2.5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
          <span className="inline-block h-px w-6 bg-ink/30" aria-hidden="true" />
          {heading}
        </h3>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="mt-5">{children}</div>
      </Reveal>
    </div>
  );
}
