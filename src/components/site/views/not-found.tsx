"use client";

import { useSite } from "@/components/site/site-context";
import { Reveal, StaggeredLines, VoltButton } from "@/components/site/primitives";

// ---------------------------------------------------------------------------
// NOT FOUND — full-dark dead end with a brand-flavoured 404. Also reused as
// the fallback composition for unknown service / project slugs.
// ---------------------------------------------------------------------------

export default function NotFoundView() {
  const { settings } = useSite();

  return (
    <section
      className="grain relative flex min-h-[80vh] items-center overflow-hidden bg-ink py-28 sm:py-36"
      aria-label="Page not found"
    >
      <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
      <div
        className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-2/3 rounded-full bg-volt/[0.07] blur-[150px]"
        aria-hidden="true"
      />

      <div className="container-x relative z-10">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p aria-hidden="true" className="display-1 select-none text-ivory">
              404<span className="text-volt">.</span>
            </p>
          </Reveal>
          <h1 className="mt-2">
            <StaggeredLines
              delay={0.15}
              lines={[<span key="line" className="block text-ivory">This page wandered off.</span>]}
              lineClassName="display-3"
            />
          </h1>
          <Reveal delay={0.35}>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-smoke">{settings.pages.notFound}</p>
          </Reveal>
          <Reveal delay={0.45} className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <VoltButton href="/">Back to home</VoltButton>
            <VoltButton href="/work" variant="outline-light">
              Browse our work
            </VoltButton>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
