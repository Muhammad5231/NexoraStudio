"use client";

import { Check, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useSite, waLink } from "@/components/site/site-context";
import {
  CTABanner,
  Multiline,
  PageHeader,
  Reveal,
  VoltButton,
} from "@/components/site/primitives";
import NotFoundView from "./not-found";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// SERVICE DETAIL — sticky price panel + editorial body (deliverables, use
// cases, process) + service FAQs. Unknown slugs fall back to the 404 view.
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  web: "Web Design & Development",
  video: "Video Editing",
  package: "The Bundle",
};

export default function ServiceDetailView({ slug }: { slug: string }) {
  const { settings, services } = useSite();
  const service = services.find((s) => s.slug === slug);

  if (!service) return <NotFoundView />;

  const whatsappHref = waLink(
    settings.contact.whatsapp,
    `Hi — I'm interested in ${service.title}.`
  );
  const meta = [service.startingPrice, service.priceNote].filter(Boolean).join(" · ");

  return (
    <>
      <PageHeader
        kicker={CATEGORY_LABELS[service.category] ?? "Service"}
        title={service.title}
        sub={service.summary}
        meta={meta || undefined}
      />

      {/* ------------------------------------------------------- body (ivory) */}
      <section className="bg-ivory py-20 text-ink sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          {/* sticky price panel */}
          <aside className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <Reveal>
                <div className="rounded-3xl border border-ink/10 bg-white/70 p-7 sm:p-9">
                  <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
                    Starting at
                  </p>
                  <p className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
                    {service.startingPrice || "Custom quote"}
                  </p>
                  {service.priceNote ? (
                    <p className="mt-3 text-sm leading-relaxed text-graphite">{service.priceNote}</p>
                  ) : null}

                  <div className="mt-8 flex flex-col gap-3">
                    <VoltButton href="/contact" className="w-full justify-center">
                      Start a Project
                    </VoltButton>
                    <VoltButton href={whatsappHref} variant="outline-dark" external className="w-full justify-center">
                      WhatsApp us
                    </VoltButton>
                  </div>

                  {service.exclusions.length > 0 ? (
                    <div className="mt-9 border-t border-ink/10 pt-8">
                      <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
                        Not included
                      </p>
                      <ul className="mt-4 space-y-3">
                        {service.exclusions.map((item) => (
                          <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-graphite">
                            <span
                              className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/5"
                              aria-hidden="true"
                            >
                              <X className="h-3 w-3 text-ink/40" />
                            </span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </Reveal>
            </div>
          </aside>

          {/* editorial body */}
          <div className="lg:col-span-7">
            {service.description ? (
              <Reveal>
                <div className="text-base leading-relaxed text-graphite sm:text-lg">
                  <Multiline text={service.description} />
                </div>
              </Reveal>
            ) : null}

            {service.deliverables.length > 0 ? (
              <DetailSection heading="What you get">
                <ul className="divide-y divide-ink/10 border-y border-ink/10">
                  {service.deliverables.map((item) => (
                    <li key={item} className="flex items-start gap-4 py-4">
                      <span
                        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-volt-2"
                        aria-hidden="true"
                      >
                        <Check className="h-3.5 w-3.5 text-ink" strokeWidth={2.5} />
                      </span>
                      <span className="text-[15px] leading-relaxed text-ink/85">{item}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}

            {service.useCases.length > 0 ? (
              <DetailSection heading="Who it&apos;s for">
                <ul className="divide-y divide-ink/10 border-y border-ink/10">
                  {service.useCases.map((item) => (
                    <li key={item} className="flex items-start gap-3.5 py-4">
                      <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-volt-2" aria-hidden="true" />
                      <span className="text-[15px] leading-relaxed text-graphite">{item}</span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            ) : null}

            {service.process.length > 0 ? (
              <DetailSection heading="How it works">
                <ol className="divide-y divide-ink/10 border-y border-ink/10">
                  {service.process.map((step, i) => (
                    <li key={step} className="flex items-start gap-5 py-4">
                      <span className="font-display text-sm font-semibold text-ink/35">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[15px] leading-relaxed text-ink/85">{step}</span>
                    </li>
                  ))}
                </ol>
              </DetailSection>
            ) : null}

            {service.faqs.length > 0 ? (
              <DetailSection heading="Common questions">
                <Accordion type="single" collapsible className="w-full">
                  {service.faqs.map((faq, i) => (
                    <Reveal key={faq.q} delay={0.04 * i}>
                      <AccordionItem value={`faq-${i}`} className="border-ink/15">
                        <AccordionTrigger className="py-6 text-left font-display text-lg font-semibold tracking-tight hover:no-underline hover:text-ink/70 [&[data-state=open]>svg]:text-ink">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 text-[15px] leading-relaxed text-graphite">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    </Reveal>
                  ))}
                </Accordion>
              </DetailSection>
            ) : null}
          </div>
        </div>
      </section>

      <CTABanner
        title={settings.home.ctaTitle}
        body={`Tell us about your ${service.title.toLowerCase()} project — you'll get honest advice on scope and budget within 24 hours.`}
        buttonLabel={settings.home.ctaButton}
        whatsappHref={whatsappHref}
      />
    </>
  );
}

/* ------------------------------------------------------- DETAIL HEADING */

function DetailSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mt-14 first-of-type:mt-12">
      <Reveal>
        <h3 className="flex items-center gap-2.5 font-display text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
          <span className="inline-block h-px w-6 bg-ink/30" aria-hidden="true" />
          {heading}
        </h3>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="mt-6">{children}</div>
      </Reveal>
    </div>
  );
}
