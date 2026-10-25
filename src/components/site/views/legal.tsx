"use client";

import type { ReactNode } from "react";
import { useSite } from "@/components/site/site-context";
import { PageHeader, Reveal } from "@/components/site/primitives";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// LEGAL — quiet typographic renderer for Privacy Policy / Terms of Service.
// Content is admin-editable (Settings → Pages). No CTA banner here on purpose.
// ---------------------------------------------------------------------------

export default function LegalView({ kind }: { kind: "privacy" | "terms" }) {
  const { settings } = useSite();
  const body = kind === "privacy" ? settings.pages.privacy : settings.pages.terms;
  const title = kind === "privacy" ? "Privacy Policy" : "Terms of Service";

  const paragraphs = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <PageHeader kicker="Legal" title={title} />

      <section className="bg-ivory py-20 text-ink sm:py-28" aria-label={title}>
        <div className="container-x">
          <div className="max-w-3xl space-y-6">
            {paragraphs.map((paragraph, i) => (
              <Reveal key={i} delay={0.02 * i}>
                {renderParagraph(paragraph, i)}
              </Reveal>
            ))}
          </div>

          <Reveal>
            <p className="mt-14 max-w-3xl border-t border-ink/10 pt-6 text-sm italic text-graphite">
              This template is editable in the admin panel — Settings → Pages.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}

/* ------------------------------------------------------------- paragraph */

function renderParagraph(p: string, i: number): ReactNode {
  // Numbered clause: "1. Short title. Body of the clause…" → title as heading.
  const numbered = p.match(/^(\d+\.\s+[^.]*\.)([\s\S]+)$/);
  if (numbered) {
    return (
      <div className={cn(i > 0 && "pt-4")}>
        <h3 className="font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
          {numbered[1].trim()}
        </h3>
        <p className="mt-2 text-[15px] leading-relaxed text-graphite sm:text-base">
          {numbered[2].trim()}
        </p>
      </div>
    );
  }

  // Simple heuristic: short heading-like lines render as headings.
  const headingLike = p.length < 45 && !/[.!?:;]$/.test(p);
  if (headingLike) {
    return (
      <h3 className={cn("font-display text-xl font-bold tracking-tight text-ink sm:text-2xl", i > 0 && "pt-6")}>
        {p}
      </h3>
    );
  }

  return <p className="text-[15px] leading-relaxed text-graphite sm:text-base">{p}</p>;
}
