"use client";

import { useSite, waLink } from "@/components/site/site-context";
import {
  CTABanner,
  Multiline,
  PageHeader,
  ParallaxImg,
  Reveal,
  SectionHead,
} from "@/components/site/primitives";

// ---------------------------------------------------------------------------
// ABOUT — portrait + bio (dark), approach + philosophy (ivory), capabilities
// and daily tools (ivory-2), independent-studio note, CTA.
// ---------------------------------------------------------------------------

export default function AboutView() {
  const { settings } = useSite();
  const about = settings.about;
  const bioParagraphs = about.bio.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);

  const whatsappHref = waLink(
    settings.contact.whatsapp,
    `Hi ${settings.brand.name} — I read your about page and I'd like to talk.`
  );

  return (
    <>
      <PageHeader
        kicker="About"
        title="One studio. One standard."
        sub="Independent by design — one pair of hands from the first call to the final delivery."
        meta={`${about.ownerName} — ${about.role}`}
      />

      {/* ------------------------------------------------ portrait + bio (dark) */}
      <section className="bg-ink py-20 text-ivory sm:py-28" aria-label="About the founder">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <Reveal>
              <ParallaxImg
                src={about.portraitUrl || "/media/portrait.png"}
                alt={`Portrait of ${about.ownerName}, ${about.role}`}
                className="aspect-[4/5] rounded-3xl border border-ivory/10"
                distance={24}
              />
            </Reveal>
          </div>

          <div className="lg:col-span-7">
            <Reveal>
              <p className="kicker flex items-center gap-2.5 text-volt">
                <span className="inline-block h-px w-8 bg-volt" aria-hidden="true" />
                The person behind the work
              </p>
            </Reveal>
            <div className="mt-7 space-y-6">
              {bioParagraphs.map((paragraph, i) => (
                <Reveal key={i} delay={0.08 * i}>
                  <p
                    className={
                      i === 0
                        ? "text-lg leading-relaxed text-ivory/90 sm:text-xl"
                        : "text-base leading-relaxed text-ivory/85"
                    }
                  >
                    {paragraph}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------- approach + philosophy (ivory) */}
      <section className="bg-ivory py-20 text-ink sm:py-28" aria-label="Working approach and philosophy">
        <div className="container-x grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <SectionHead dark={false} kicker="Working Approach" title="Small scope, executed properly." />
            <Reveal delay={0.16}>
              <div className="mt-6 max-w-xl text-base leading-relaxed text-graphite sm:text-lg">
                <Multiline text={about.approach} />
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-6 lg:pl-10">
            <Reveal delay={0.1}>
              <figure className="border-l-2 border-ink pl-6 sm:pl-8">
                <span aria-hidden="true" className="font-display text-6xl font-bold leading-none text-volt-2">
                  &ldquo;
                </span>
                <blockquote className="mt-2 text-lg italic leading-relaxed text-ink/80">
                  <Multiline text={about.philosophy} />
                </blockquote>
                <figcaption className="mt-6 font-display text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
                  Studio philosophy
                </figcaption>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ------------------------------------------- capabilities + tools (ivory-2) */}
      <section className="bg-ivory-2 py-20 text-ink sm:py-28" aria-label="Capabilities and tools">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <SectionHead dark={false} kicker="Capabilities" title="Sharp where it matters." />
              </div>
            </div>
            <div className="lg:col-span-8">
              <div className="divide-y divide-ink/10 border-y border-ink/10">
                {about.skills.map((skill, i) => (
                  <Reveal key={skill} delay={0.04 * i}>
                    <div className="group flex items-baseline gap-5 py-4 transition-all duration-300 hover:pl-3">
                      <span className="font-display text-sm font-semibold text-ink/30">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-base font-semibold sm:text-lg">{skill}</span>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16 sm:mt-20">
            <Reveal>
              <p className="kicker flex items-center gap-2.5 text-ink/60">
                <span className="inline-block h-px w-8 bg-ink/40" aria-hidden="true" />
                Daily Tools
              </p>
            </Reveal>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {about.tools.map((tool, i) => (
                <Reveal key={tool} delay={0.04 * i}>
                  <div className="rounded-full border border-ink/15 py-3 text-center font-display text-sm font-semibold text-ink/75 transition-colors duration-300 hover:border-ink/40 hover:text-ink">
                    {tool}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------- independent-studio note */}
      <section className="border-t border-ink/10 bg-ivory-2 py-12 sm:py-14" aria-label="How the studio operates">
        <div className="container-x">
          <Reveal>
            <p className="flex max-w-3xl items-start gap-4 text-[15px] leading-relaxed text-graphite sm:text-base">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-[2px] bg-volt-2" aria-hidden="true" />
              <span>
                Nexora is a one-person studio — you work directly with the person building your project.
                No account managers, no hand-offs.
              </span>
            </p>
          </Reveal>
        </div>
      </section>

      <CTABanner
        title="Sound like your kind of studio?"
        body={settings.home.ctaBody}
        buttonLabel="Start a Project"
        whatsappHref={whatsappHref}
      />
    </>
  );
}
