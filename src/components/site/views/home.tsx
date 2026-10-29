"use client";

import { Fragment, useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Globe, Play, Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "@/lib/router";
import { useSite, waLink } from "@/components/site/site-context";
import {
  Chip,
  Counter,
  CTABanner,
  EASE,
  Marquee,
  MediaFrame,
  Magnetic,
  Reveal,
  ScrollTextFill,
  ScrollZoom,
  SectionHead,
  VoltButton,
  WordsReveal,
} from "@/components/site/primitives";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// HOME — cinematic hero, editorial sections, DB-driven work & services.
// ---------------------------------------------------------------------------

export function HomeView() {
  const { settings, projects, services, faqs, testimonials } = useSite();
  const h = settings.home;

  const webServices = services.filter((s) => s.category === "web").slice(0, 4);
  const videoServices = services.filter((s) => s.category === "video").slice(0, 3);
  // featured projects surface first (stable order), then fill with the rest
  const ordered = [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));
  const featured = ordered.slice(0, 4);
  const whatsappHref = waLink(
    settings.contact.whatsapp,
    `Hi ${settings.brand.name} — I'd like to discuss a project.`
  );

  return (
    <>
      <Hero />
      <Marquee items={h.marquee} />
      <IntroSection />
      <WorkSection projects={featured} />
      <WebSection services={webServices} />
      <VideoSection services={videoServices} />
      <PackageSection />
      <ProcessSection />
      <TestimonialSection hasTestimonials={testimonials.length > 0} />
      <FaqSection faqs={faqs} />
      <CTABanner title={h.ctaTitle} body={h.ctaBody} buttonLabel={h.ctaButton} whatsappHref={whatsappHref} />
    </>
  );
}

/* ------------------------------------------------------ hero motion helpers */

/** One masked word of the hero title — slides up with a slight rotate. */
function HeroWord({
  children,
  delay,
  className,
  underline = false,
}: {
  children: string;
  delay: number;
  className?: string;
  underline?: boolean;
}) {
  return (
    <span className="inline-block overflow-hidden pb-[0.1em] -mb-[0.1em] align-bottom">
      <motion.span
        className={cn("relative inline-block will-change-transform", className)}
        initial={{ y: "112%", rotate: 3 }}
        animate={{ y: "0%", rotate: 0 }}
        transition={{ duration: 0.85, delay, ease: EASE }}
      >
        {children}
        {underline ? (
          <motion.span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-[0.05em] h-[0.055em] origin-left bg-volt"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: delay + 0.35, ease: EASE }}
          />
        ) : null}
      </motion.span>
    </span>
  );
}

/** Cursor-following volt glow — fine pointers only, purely decorative. */
function Spotlight() {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const primed = useRef(false);
  const x = useMotionValue(-900);
  const y = useMotionValue(-900);
  const sx = useSpring(x, { stiffness: 55, damping: 20, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 55, damping: 20, mass: 0.6 });

  useEffect(() => {
    if (reduce || typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: MouseEvent) => {
      const rect = wrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (!primed.current) {
        // first move: snap to the cursor so the glow doesn't fly across the hero
        primed.current = true;
        sx.jump(px);
        sy.jump(py);
        return;
      }
      x.set(px);
      y.set(py);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [reduce, x, y, sx, sy]);

  return (
    <div ref={wrapRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      <motion.div style={{ x: sx, y: sy }} className="absolute left-0 top-0 will-change-transform">
        <div className="h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(198,255,58,0.07)_0%,rgba(198,255,58,0.02)_38%,transparent_68%)]" />
      </motion.div>
    </div>
  );
}

/** Slowly rotating circular caption around the hero media stack. */
function OrbitBadge({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none hidden lg:block", className)} aria-hidden="true">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="animate-spin-slow h-full w-full">
          <defs>
            <path id="hero-orbit" d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0" fill="none" />
          </defs>
          <text className="fill-ivory/55 font-display" style={{ fontSize: "8px", letterSpacing: "0.24em" }}>
            <textPath href="#hero-orbit">WEBSITES · VIDEO · GROWTH · NEXORA ·</textPath>
          </text>
        </svg>
        <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-volt shadow-[0_0_12px_rgba(198,255,58,0.8)]" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------- HERO */

function Hero() {
  const { settings } = useSite();
  const h = settings.home;
  const reduce = useReducedMotion();

  // meta strip → split the data-driven string into segments with volt dot separators
  const heroMetaParts = (h.heroMeta ?? "")
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);

  // kinetic title — admin-managed lines split into words for the masked reveal
  const line1Words = useMemo(() => h.heroTitleLine1.split(/\s+/).filter(Boolean), [h.heroTitleLine1]);
  const line2Words = useMemo(() => h.heroTitleLine2.split(/\s+/).filter(Boolean), [h.heroTitleLine2]);
  const accentWord = h.heroTitleAccent.trim();

  // mouse parallax for the media stack (desktop only)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 18 });
  const sy = useSpring(my, { stiffness: 60, damping: 18 });

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, reduce ? 0 : -70]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.28], [1, reduce ? 1 : 0.35]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, reduce ? 1 : 0.965]);
  const sxInvert = useTransform(sx, (v) => -v * 0.55);
  const syInvert = useTransform(sy, (v) => -v * 0.55);

  // word choreography timeline
  const WORD_STAGGER = 0.055;
  const t1 = 0.15;
  const t2 = t1 + line1Words.length * WORD_STAGGER + 0.1;

  return (
    <section
      className="grain relative flex min-h-svh flex-col overflow-hidden bg-ink pb-14 pt-32 sm:pb-16 sm:pt-40 lg:pb-10"
      onMouseMove={(e) => {
        if (reduce) return;
        mx.set((e.clientX / window.innerWidth - 0.5) * 18);
        my.set((e.clientY / window.innerHeight - 0.5) * 14);
      }}
    >
      {/* backdrop — grid fades toward the edges for a cinematic vignette */}
      <div
        className="bg-grid-dark absolute inset-0"
        style={{
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 38%, black 30%, transparent 78%)",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 38%, black 30%, transparent 78%)",
        }}
        aria-hidden="true"
      />
      {/* aurora backdrop — slow-drifting volt & ivory light fields */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="animate-aurora-a absolute -top-[22%] left-[4%] h-[520px] w-[680px] rounded-full bg-volt/[0.07] blur-[130px]" />
        <div className="animate-aurora-b absolute -bottom-[28%] right-[-8%] h-[520px] w-[560px] rounded-full bg-ivory/[0.05] blur-[150px]" />
      </div>

      {/* cursor spotlight — follows the pointer on fine-pointer devices */}
      <Spotlight />

      <motion.div
        style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
        className="container-x relative z-10 flex flex-1 flex-col"
      >
        <div className="grid flex-1 items-center gap-14 lg:grid-cols-12 lg:gap-8">
          {/* copy */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="inline-flex items-center gap-2.5 rounded-full border border-ivory/15 bg-coal/70 px-4 py-2.5 backdrop-blur-sm"
            >
              <span className="animate-pulse-dot inline-block h-2 w-2 rounded-full bg-volt" aria-hidden="true" />
              <span className="kicker text-ivory/75">{h.heroKicker}</span>
            </motion.div>

            <h1 className="mt-8">
              <span className="sr-only">
                {h.heroTitleLine1} {h.heroTitleLine2} {h.heroTitleAccent}
              </span>
              <span aria-hidden="true" className="block">
                <span className="display-1 hero-display block">
                  {line1Words.map((word, i) => (
                    <Fragment key={i}>
                      <HeroWord
                        delay={t1 + i * WORD_STAGGER}
                        className="bg-gradient-to-b from-ivory via-ivory to-ivory/60 bg-clip-text text-transparent"
                      >
                        {word}
                      </HeroWord>
                      {i < line1Words.length - 1 ? " " : null}
                    </Fragment>
                  ))}
                </span>
                <span className="display-1 hero-display mt-1 block text-ivory sm:mt-2">
                  {line2Words.map((word, i) => (
                    <Fragment key={i}>
                      <HeroWord delay={t2 + i * WORD_STAGGER}>{word}</HeroWord>
                      {" "}
                    </Fragment>
                  ))}
                  <HeroWord
                    delay={t2 + line2Words.length * WORD_STAGGER + 0.05}
                    className="text-volt"
                    underline
                  >
                    {accentWord}
                  </HeroWord>
                </span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.42, ease: EASE }}
              className="mt-7 max-w-xl text-base leading-relaxed text-smoke sm:text-lg"
            >
              {h.heroSubtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.52, ease: EASE }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Magnetic>
                <VoltButton href="/contact" size="lg" className="shadow-[0_14px_44px_-14px_rgba(198,255,58,0.55)]">
                  {h.ctaPrimary}
                </VoltButton>
              </Magnetic>
              <VoltButton href="/work" variant="outline-light" size="lg">
                {h.ctaSecondary}
              </VoltButton>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-10 flex flex-wrap items-center gap-x-3.5 gap-y-2 font-display text-[11px] uppercase tracking-[0.22em] text-ivory/40"
            >
              {heroMetaParts.map((part, i) => (
                <span key={i} className="flex items-center gap-3.5">
                  {i > 0 ? <span className="h-1 w-1 rounded-full bg-volt/80" aria-hidden="true" /> : null}
                  {part}
                </span>
              ))}
            </motion.p>
          </div>

          {/* media stack */}
          <motion.div
            className="relative lg:col-span-5"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.35, ease: EASE }}
          >
            <motion.div style={{ x: sx, y: sy }} className="relative mx-auto w-full max-w-[560px]">
              {/* ambient volt glow — lifts the stack off the ink backdrop */}
              <div aria-hidden="true" className="absolute -inset-10 rounded-[2.5rem] bg-volt/[0.07] blur-[70px]" />

              {/* technical crosshairs — editorial corner marks */}
              <span aria-hidden="true" className="absolute -left-6 -top-6 hidden select-none font-display text-xl leading-none text-ivory/25 sm:block">+</span>
              <span aria-hidden="true" className="absolute -bottom-6 -right-6 hidden select-none font-display text-xl leading-none text-ivory/25 sm:block">+</span>

              {/* offset accent frame — volt outline echoing the brand system */}
              <div
                aria-hidden="true"
                className="absolute -right-3.5 -top-3.5 hidden h-full w-full rounded-2xl border border-volt/30 sm:block"
              />
              {/* main frame — website work */}
              <div className="relative overflow-hidden rounded-2xl border border-ivory/15 shadow-[0_50px_100px_-30px_rgba(0,0,0,0.85)]">
                <MediaFrame src={h.heroMediaMain} alt="Selected website work preview" ratio="4/3.4" className="rounded-2xl">
                  {/* browser chrome */}
                  <div className="absolute inset-x-0 top-0 flex items-center gap-1.5 border-b border-ivory/10 bg-ink/70 px-4 py-2.5 backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-ivory/25" aria-hidden="true" />
                    <span className="h-2 w-2 rounded-full bg-ivory/25" aria-hidden="true" />
                    <span className="h-2 w-2 rounded-full bg-volt/70" aria-hidden="true" />
                    <span className="ml-3 flex h-4 flex-1 items-center rounded-full bg-ivory/10 px-2.5" aria-hidden="true">
                      <span className="h-1 w-14 rounded-full bg-ivory/25" />
                    </span>
                  </div>
                  {/* premium shine sweep on load */}
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-ivory/[0.09] to-transparent"
                    initial={{ x: "-160%" }}
                    animate={{ x: "420%" }}
                    transition={{ duration: 1.5, delay: 1.05, ease: "easeInOut" }}
                  />
                  {/* cinematic blend into the ink backdrop */}
                  <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
                  <div aria-hidden="true" className="pointer-events-none absolute inset-0 shadow-[inset_0_0_90px_rgba(11,11,12,0.4)]" />
                </MediaFrame>
              </div>

              {/* reel card — video work */}
              <motion.div
                className="absolute -bottom-8 -left-3 w-28 sm:-bottom-10 sm:-left-7 sm:w-36"
                style={{ x: sxInvert, y: syInvert }}
              >
                <div className="group/reel relative">
                  <div aria-hidden="true" className="absolute -inset-3.5 rounded-2xl bg-volt/[0.16] blur-xl" />
                  <div className="relative overflow-hidden rounded-xl border border-ivory/15 shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/reel:-translate-y-1.5">
                    <MediaFrame src={h.heroMediaSecondary} alt="Video editing work preview" ratio="9/16" className="rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent" aria-hidden="true" />
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-volt px-2 py-0.5 font-display text-[9px] font-bold uppercase tracking-widest text-ink">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" aria-hidden="true" /> Reel
                      </span>
                      <span className="absolute bottom-2 left-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-volt shadow-[0_0_18px_-4px_rgba(198,255,58,0.8)]">
                        <Play className="ml-0.5 h-3 w-3 fill-ink text-ink" aria-hidden="true" />
                      </span>
                    </MediaFrame>
                  </div>
                </div>
              </motion.div>

              {/* availability chip */}
              <div className="absolute -right-2 top-6 hidden items-center gap-2 rounded-full border border-volt/30 bg-ink/85 px-4 py-2 shadow-[0_0_32px_-8px_rgba(198,255,58,0.45)] backdrop-blur-md sm:flex">
                <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-volt" aria-hidden="true" />
                <span className="font-display text-[10px] font-medium uppercase tracking-[0.18em] text-ivory/80">
                  Available for projects
                </span>
              </div>

              {/* rotating orbit badge */}
              <OrbitBadge className="absolute -bottom-14 -right-6 z-10" />
            </motion.div>
          </motion.div>
        </div>

        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="hidden items-center gap-4 pt-10 lg:flex"
          aria-hidden="true"
        >
          <span className="relative flex h-10 w-6 items-start justify-center rounded-full border border-ivory/25 p-2">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-volt"
              animate={reduce ? undefined : { y: [0, 12, 0], opacity: [1, 0.35, 1] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            />
          </span>
          <span className="font-display text-[10px] uppercase tracking-[0.25em] text-ivory/40">Scroll to explore</span>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* --------------------------------------------------------------- INTRO (ivory) */

function IntroSection() {
  const { settings } = useSite();
  const h = settings.home;

  return (
    <section className="bg-ivory py-20 text-ink sm:py-28">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <p className="kicker flex items-center gap-2.5 text-ink/60">
                <span className="inline-block h-px w-8 bg-ink/40" aria-hidden="true" />
                {h.introKicker}
              </p>
            </Reveal>
            <h2 className="display-2 mt-5 max-w-2xl">
              <WordsReveal text={h.introTitle} />
            </h2>
          </div>
          <div className="flex flex-col justify-end lg:col-span-5">
            <ScrollTextFill
              text={h.introBody}
              className="text-lg leading-relaxed text-graphite sm:text-xl"
            />
          </div>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-ink/10 bg-ink/10 sm:grid-cols-3">
          {h.introPoints.map((point, i) => (
            <Reveal key={i} delay={0.1 + i * 0.08} variant="blur" className="h-full">
              <div className="flex h-full flex-col gap-4 bg-ivory p-7">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ink">
                  <Check className="h-4 w-4 text-volt" aria-hidden="true" />
                </span>
                <p className="text-[15px] font-medium leading-relaxed">{point}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- WORK (dark) */

function WorkSection({ projects }: { projects: ReturnType<typeof useSite>["projects"] }) {
  const { settings } = useSite();

  if (projects.length === 0) return null;

  const spans = [
    "lg:col-span-7",
    "lg:col-span-5 lg:mt-20",
    "lg:col-span-5 lg:-mt-10",
    "lg:col-span-7 lg:mt-4",
  ];
  const ratios = ["16/10", "4/3.4", "4/3.4", "16/10"];

  return (
    <section className="bg-ink py-20 sm:py-28">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead kicker="Selected Work" title={<>Recent builds & cuts.</>} />
          <Reveal delay={0.1}>
            <Link
              href="/work"
              className="group mb-1 inline-flex items-center gap-2 font-display text-sm font-semibold text-ivory/80 transition-colors hover:text-volt"
            >
              All projects
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-12 lg:gap-8">
          {projects.map((project, i) => (
            <Reveal key={project.id} delay={0.06 * i} className={cn("lg:col-span-6", spans[i % spans.length])}>
              <Link href={`/work/${project.slug}`} className="group block" ariaLabel={`View case study: ${project.title}`}>
                <ScrollZoom className="rounded-2xl">
                <MediaFrame src={project.coverImage || "/media/hero-main.png"} alt={`${project.title} — ${project.category}`} ratio={ratios[i % ratios.length]} className="rounded-2xl border border-ivory/10">
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" />
                  <span className="absolute right-4 top-4 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-volt opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    <ArrowUpRight className="h-5 w-5 text-ink" aria-hidden="true" />
                  </span>
                  {project.projectType !== "Client Project" ? (
                    <span className="absolute left-4 top-4 rounded-full border border-ivory/20 bg-ink/70 px-3 py-1 font-display text-[10px] font-medium uppercase tracking-[0.16em] text-ivory/80 backdrop-blur-sm">
                      {project.projectType}
                    </span>
                  ) : null}
                </MediaFrame>
                </ScrollZoom>
                <div className="mt-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl font-bold tracking-tight text-ivory transition-colors group-hover:text-volt sm:text-2xl">
                      {project.title}
                    </h3>
                    <p className="mt-1.5 line-clamp-1 text-sm text-smoke">{project.description}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-[11px] uppercase tracking-[0.16em] text-volt">{project.category}</p>
                    <p className="mt-1 font-display text-[11px] uppercase tracking-[0.16em] text-ivory/35">{project.year}</p>
                  </div>
                </div>
              </Link>

              {/* admin-controlled live site link — opens the deployed project */}
              {project.showLiveUrl && project.liveUrl ? (
                <a
                  href={project.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-ivory/15 px-4 py-2 font-display text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory/70 transition-colors duration-300 hover:border-volt hover:text-volt"
                  aria-label={`Open the live website of ${project.title} in a new tab`}
                >
                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                  View live website
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ) : null}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------- WEB SERVICES (ivory) */

function WebSection({ services }: { services: ReturnType<typeof useSite>["services"] }) {
  const { settings } = useSite();
  const h = settings.home;

  return (
    <section className="bg-ivory-2 py-20 text-ink sm:py-28">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <SectionHead dark={false} kicker={h.webKicker} title={h.webTitle} body={h.webBody} />
            <Reveal delay={0.2} className="mt-9">
              <VoltButton href="/services" variant="ink">
                View all services
              </VoltButton>
            </Reveal>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="divide-y divide-ink/10 border-y border-ink/10">
            {services.map((service, i) => (
              <Reveal key={service.id} delay={0.06 * i}>
                <Link href={`/services/${service.slug}`} className="group flex items-start gap-5 py-7 transition-colors sm:gap-8">
                  <span className="font-display text-sm font-semibold text-ink/35 transition-colors group-hover:text-volt-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-display text-xl font-bold tracking-tight transition-colors group-hover:text-ink/70 sm:text-2xl">
                      {service.title}
                    </h3>
                    <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-graphite">{service.summary}</p>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    {service.startingPrice ? (
                      <span className="whitespace-nowrap rounded-full border border-ink/15 px-3 py-1 font-display text-xs font-semibold">
                        {service.startingPrice}
                      </span>
                    ) : null}
                    <ArrowUpRight className="h-5 w-5 text-ink/30 transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-ink" aria-hidden="true" />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------- VIDEO SERVICES (dark) */

function VideoSection({ services }: { services: ReturnType<typeof useSite>["services"] }) {
  const { settings } = useSite();
  const h = settings.home;
  const { heroMediaSecondary } = h;

  return (
    <section className="grain relative overflow-hidden bg-ink py-20 sm:py-28">
      <div className="absolute right-[-15%] top-0 h-[420px] w-[420px] rounded-full bg-volt/[0.06] blur-[140px]" aria-hidden="true" />
      <div className="container-x relative z-10 grid items-center gap-14 lg:grid-cols-12">
        <div className="order-2 lg:order-1 lg:col-span-5">
          <Reveal>
            <div className="relative mx-auto max-w-[340px] sm:max-w-[380px]">
              <ScrollZoom className="rounded-3xl" zoom={1.1}>
                <MediaFrame
                  src={heroMediaSecondary}
                  alt="Short-form video editing work"
                  ratio="9/16"
                  className="rounded-3xl border border-ivory/12"
                />
              </ScrollZoom>
              {/* timeline strip */}
              <div className="absolute inset-x-4 bottom-4 overflow-hidden rounded-xl border border-ivory/15 bg-ink/80 p-3 backdrop-blur-md" aria-hidden="true">
                <div className="flex items-center gap-1.5">
                  {[38, 22, 30, 14, 26, 18, 34].map((w, i) => (
                    <span
                      key={i}
                      className={cn("h-5 rounded-sm", i % 3 === 0 ? "bg-volt/80" : "bg-ivory/20")}
                      style={{ width: `${w}px` }}
                    />
                  ))}
                </div>
                <div className="mt-2 flex items-center justify-between font-display text-[9px] uppercase tracking-widest text-ivory/40">
                  <span>timeline</span>
                  <span className="text-volt">00:42</span>
                </div>
              </div>
              <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-volt px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-ink">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" aria-hidden="true" /> 9:16
              </span>
            </div>
          </Reveal>
        </div>

        <div className="order-1 lg:order-2 lg:col-span-7">
          <SectionHead kicker={h.videoKicker} title={h.videoTitle} body={h.videoBody} />
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {services.map((service, i) => (
              <Reveal key={service.id} delay={0.08 * i}>
                <Link
                  href={`/services/${service.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-ivory/10 bg-coal/60 p-5 transition-colors hover:border-volt/40"
                >
                  <p className="font-display text-[10px] uppercase tracking-[0.18em] text-volt">{service.startingPrice || "Custom"}</p>
                  <h3 className="mt-2 font-display text-base font-bold tracking-tight text-ivory">{service.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-smoke">{service.summary}</p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-4 font-display text-xs font-semibold uppercase tracking-[0.14em] text-ivory/50 transition-colors group-hover:text-volt">
                    Details <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- PACKAGE (ivory-2) */

function PackageSection() {
  const { settings, services } = useSite();
  const h = settings.home;
  // CTA follows the live package service (renames/unpublish stay safe)
  const packageHref = services.some((s) => s.category === "package")
    ? `/services/${services.find((s) => s.category === "package")!.slug}`
    : "/services";

  return (
    <section className="bg-ivory-2 py-20 text-ink sm:py-28">
      <div className="container-x">
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-ivory">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-12 lg:p-14">
              <Reveal>
                <Chip dark={false} className="border-ink/20 bg-ink text-volt">
                  {h.packageKicker}
                </Chip>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="display-2 mt-6">{h.packageTitle}</h2>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="mt-5 max-w-md text-base leading-relaxed text-graphite">{h.packageBody}</p>
              </Reveal>
              <Reveal delay={0.2} className="mt-8 flex flex-wrap items-center gap-5">
                <span className="font-display text-3xl font-bold tracking-tight">{h.packagePrice}</span>
                <VoltButton href={packageHref} variant="ink">
                  {h.packageCta}
                </VoltButton>
              </Reveal>
            </div>
            <div className="border-t border-ink/10 bg-ink p-8 text-ivory sm:p-12 lg:border-l lg:border-t-0">
              <Reveal>
                <p className="font-display text-xs uppercase tracking-[0.2em] text-ivory/40">What&apos;s included</p>
              </Reveal>
              <ul className="mt-7 space-y-4">
                {h.packageFeatures.map((feature, i) => (
                  <Reveal key={i} delay={0.06 * i} variant="blur">
                    <li className="flex items-start gap-3.5">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-volt/15">
                        <Check className="h-3.5 w-3.5 text-volt" aria-hidden="true" />
                      </span>
                      <span className="text-[15px] leading-relaxed text-ivory/85">{feature}</span>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------- PROCESS (dark) */

function ProcessSection() {
  const { settings } = useSite();
  const h = settings.home;
  const lineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: lineRef, offset: ["start 0.85", "end 0.55"] });
  const lineScale = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });

  return (
    <section className="bg-ink py-20 sm:py-28">
      <div className="container-x">
        <SectionHead kicker={h.processKicker} title={h.processTitle} align="center" />

        <div ref={lineRef} className="relative mt-16 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* connecting line (desktop) — base track */}
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-ivory/10 lg:block" aria-hidden="true" />
          {/* volt progress line — draws itself across the steps as you scroll.
              Always rendered (hydration-safe); hidden for reduced-motion via CSS. */}
          <motion.div
            style={{ scaleX: lineScale }}
            className="absolute left-0 right-0 top-7 hidden h-px origin-left bg-gradient-to-r from-volt via-volt/70 to-volt/15 lg:block motion-reduce:hidden"
            aria-hidden="true"
          />
          {h.processSteps.map((step, i) => (
            <Reveal key={i} delay={0.08 * i} variant="blur">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-volt/30 bg-ink font-display text-lg font-bold text-volt">
                  {step.step}
                </div>
                <h3 className="mt-6 font-display text-xl font-bold tracking-tight text-ivory">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-smoke">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* stats strip */}
        <div className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-ivory/10 bg-ivory/10 lg:grid-cols-4">
          {h.stats.map((stat, i) => (
            <div key={i} className="bg-ink-2 p-7 sm:p-9">
              <Reveal delay={0.05 * i} variant="scale">
                <p className="font-display text-4xl font-bold tracking-tight text-volt sm:text-5xl">
                  <Counter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-3 text-sm leading-snug text-smoke">{stat.label}</p>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ TESTIMONIALS */

function TestimonialSection({ hasTestimonials }: { hasTestimonials: boolean }) {
  const { testimonials } = useSite();

  if (!hasTestimonials) {
    return (
      <section className="border-y border-ivory/10 bg-ink-2 py-20 sm:py-24">
        <div className="container-x">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-volt/25 bg-volt/10" aria-hidden="true">
                <Plus className="h-6 w-6 text-volt" />
              </div>
              <h2 className="display-3 mt-7 text-ivory">Client stories are being written.</h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-smoke">
                We&apos;re a young studio — our first case studies are in production. Be one of the names that lands here.
              </p>
              <div className="mt-8 flex justify-center">
                <VoltButton href="/contact">Become our next story</VoltButton>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="border-y border-ivory/10 bg-ink-2 py-20 sm:py-28">
      <div className="container-x">
        <SectionHead kicker="Kind Words" title="What clients say." align="center" />
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={t.id} delay={0.06 * i} variant="blur">
              <figure className="flex h-full flex-col rounded-2xl border border-ivory/10 bg-coal p-7">
                <div className="flex gap-1" role="img" aria-label={`${t.rating} out of 5`}>
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <span key={j} className="h-1.5 w-6 rounded-full bg-volt" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-ivory/85">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-6 border-t border-ivory/10 pt-4">
                  <p className="font-display text-sm font-semibold text-ivory">{t.name}</p>
                  <p className="mt-0.5 text-xs text-smoke">{[t.role, t.company].filter(Boolean).join(" · ")}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- FAQ (ivory) */

function FaqSection({ faqs }: { faqs: ReturnType<typeof useSite>["faqs"] }) {
  if (faqs.length === 0) return null;

  return (
    <section className="bg-ivory py-20 text-ink sm:py-28">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <SectionHead dark={false} kicker="FAQ" title="Questions, answered straight." />
          </div>
        </div>
        <div className="lg:col-span-8">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <Reveal key={faq.id} delay={0.04 * i}>
                <AccordionItem value={faq.id} className="border-ink/15">
                  <AccordionTrigger className="py-6 text-left font-display text-lg font-semibold tracking-tight hover:no-underline hover:text-ink/70 [&[data-state=open]>svg]:text-ink">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6 text-[15px] leading-relaxed text-graphite">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </Reveal>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

export default HomeView;
