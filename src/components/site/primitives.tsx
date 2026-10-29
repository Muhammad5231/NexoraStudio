"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/router";
import { useSite } from "@/components/site/site-context";
import { isInViewport, onEnterView } from "@/lib/in-view";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared editorial primitives for the public site. Keep these cohesive —
// every view composes from here.
// ---------------------------------------------------------------------------

export const EASE = [0.22, 1, 0.36, 1] as const;

// useLayoutEffect on the client (applies the hidden state BEFORE the first
// paint, so nothing flashes), plain useEffect on the server (no-op there).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ------------------------------------------------------------------ Reveal */

export type RevealVariant = "up" | "blur" | "scale" | "left" | "right";

/**
 * Scroll-triggered entrance, driven by ONE shared IntersectionObserver + CSS
 * transitions (see src/lib/in-view.ts + the [data-reveal] rules in
 * globals.css). Replaces the old framer-motion whileInView version whose
 * per-element observers could miss and leave content stuck at opacity:0.
 *
 * Failure-proof by design — the hidden state is applied by JS only and has
 * four safety nets, so the worst case is "appears without animation",
 * never "invisible forever":
 *   1. SSR markup is fully visible (no opacity:0 in the HTML — no-JS safe).
 *   2. Without IntersectionObserver support nothing is ever hidden.
 *   3. prefers-reduced-motion forces visibility in CSS regardless of JS.
 *   4. A watchdog reveals any element still hidden while on screen.
 */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = true,
  variant = "up",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  /** Kept for API compatibility — reveals are permanent (no consumers re-hide). */
  once?: boolean;
  variant?: RevealVariant;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // reduced motion / old browsers: keep content fully visible (CSS also
    // enforces this — see the prefers-reduced-motion block in globals.css)
    if (typeof IntersectionObserver === "undefined") return;

    // hidden state lives in dataset attributes, which React never rewrites
    // (unlike classList — React re-applies className on prop changes)
    el.dataset.reveal = variant;
    if (variant === "up" && y !== 28) el.style.setProperty("--reveal-y", `${y}px`);
    if (delay > 0) el.style.setProperty("--reveal-delay", `${Math.round(delay * 1000)}ms`);
    el.getBoundingClientRect(); // commit the hidden state so the transition runs even if already on screen

    let revealed = false;
    let settleTimer = 0;
    const show = () => {
      if (revealed) return;
      revealed = true;
      el.dataset.revealState = "in";
      if (once) stop();
      // once the transition settles, strip the hooks so the element is back
      // to plain CSS (no lingering transition-delay on hover styles etc.)
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        delete el.dataset.revealState;
        delete el.dataset.reveal;
        el.style.removeProperty("--reveal-delay");
        el.style.removeProperty("--reveal-y");
      }, 900 + delay * 1000);
    };
    const stop = onEnterView(el, show);
    // safety net: if the event never fired but the element is on screen, show it
    const watchdog = window.setTimeout(() => {
      if (!revealed && isInViewport(el)) show();
    }, 1200);

    return () => {
      window.clearTimeout(watchdog);
      window.clearTimeout(settleTimer);
      stop();
      delete el.dataset.revealState;
      delete el.dataset.reveal;
      el.style.removeProperty("--reveal-delay");
      el.style.removeProperty("--reveal-y");
    };
  }, [variant, delay, y, once]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------- WordsReveal */
/**
 * Word-by-word masked reveal driven by scroll position — each word slides up
 * out of its own overflow mask as the text enters the viewport.
 *
 * Same failure-proof pattern as Reveal: SSR markup renders the words fully
 * visible; the hidden state is added by JS only (data-words-pre, CSS-driven
 * stagger via --wr-i), the shared observer flips it, and a watchdog plus the
 * prefers-reduced-motion CSS rule guarantee the text can never stay hidden.
 */
export function WordsReveal({
  text,
  className,
  wordClassName,
  delay = 0,
  stagger = 0.05,
  once = true,
}: {
  text: string;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  /** Kept for API compatibility — reveals are permanent (no consumers re-hide). */
  once?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") return;
    // observe the un-clipped container — masked inner spans are fully clipped
    // by their overflow-hidden parents, so observing them directly can miss the
    // "already in view at mount" case (e.g. hash-navigating to a new view)
    el.dataset.wordsPre = "true";
    el.style.setProperty("--wr-delay", `${Math.round(delay * 1000)}ms`);
    el.style.setProperty("--wr-stagger", `${Math.round(stagger * 1000)}ms`);
    el.getBoundingClientRect(); // commit the hidden state before revealing

    let revealed = false;
    let settleTimer = 0;
    const show = () => {
      if (revealed) return;
      revealed = true;
      delete el.dataset.wordsPre;
      if (once) stop();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        el.style.removeProperty("--wr-delay");
        el.style.removeProperty("--wr-stagger");
      }, 900 + (delay + words.length * stagger) * 1000);
    };
    const stop = onEnterView(el, show);
    const watchdog = window.setTimeout(() => {
      if (!revealed && isInViewport(el)) show();
    }, 1200);

    return () => {
      window.clearTimeout(watchdog);
      window.clearTimeout(settleTimer);
      stop();
      delete el.dataset.wordsPre;
      el.style.removeProperty("--wr-delay");
      el.style.removeProperty("--wr-stagger");
    };
  }, [text, delay, stagger, once, words.length]);

  return (
    <span ref={ref} className={cn("words-reveal", className)}>
      {words.map((word, i) => (
        <span
          key={`${word}-${i}`}
          className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom"
        >
          <span
            className={cn("words-reveal-word inline-block", wordClassName)}
            style={{ "--wr-i": i } as CSSProperties}
          >
            {word}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </span>
  );
}

/* ---------------------------------------------------------- ScrollTextFill */
/**
 * Manifesto-style fill: words start dim and ink themselves in one by one as
 * the paragraph travels up the viewport (scroll-linked, not time-based).
 */
export function ScrollTextFill({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.92", "end 0.55"] });
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text]);

  return (
    <p ref={ref} className={cn("relative", className)}>
      {words.map((word, i) => (
        <FillWord
          key={`${word}-${i}`}
          progress={scrollYProgress}
          range={[i / words.length, Math.min(1, (i + 1.6) / words.length)]}
          dim={reduce === true}
        >
          {word}
        </FillWord>
      ))}
    </p>
  );
}

function FillWord({
  progress,
  range,
  dim,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  dim: boolean;
  children: string;
}) {
  const opacity = useTransform(progress, range, dim ? [1, 1] : [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.26em] inline-block">
      {children}
    </motion.span>
  );
}

/* --------------------------------------------------------------- ScrollZoom */
/**
 * Cinematic media reveal — content starts slightly zoomed-in / pushed down
 * inside an overflow mask and settles to rest as it enters the viewport.
 */
export function ScrollZoom({
  children,
  className,
  zoom = 1.14,
}: {
  children: ReactNode;
  className?: string;
  zoom?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.3"] });
  const scale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [zoom, 1]);
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [26, 0]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div style={{ scale, y }} className="h-full w-full will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

/* --------------------------------------------------------------- ScrollStrip */
/**
 * Giant outlined display text that drifts horizontally, driven by the
 * page scroll. Purely decorative (aria-hidden).
 */
export function ScrollStrip({
  text,
  className,
  reverse = false,
}: {
  text: string;
  className?: string;
  reverse?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : reverse ? ["-14%", "0%"] : ["0%", "-14%"]);
  const phrase = useMemo(() => Array(4).fill(text).join("\u00A0\u00A0\u00A0"), [text]);

  return (
    <div ref={ref} aria-hidden="true" className={cn("pointer-events-none select-none overflow-hidden", className)}>
      <motion.div style={{ x }} className="text-outline whitespace-nowrap font-display font-bold leading-none tracking-tight">
        {phrase}
      </motion.div>
    </div>
  );
}

/* ------------------------------------------------------------ ScrollProgress */
/** Scroll-linked progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  // always rendered (hydration-safe) — hidden for reduced-motion users via CSS
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });

  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[80] h-0.5 origin-left bg-volt shadow-[0_0_14px_rgba(198,255,58,0.55)] motion-reduce:hidden"
      style={{ scaleX }}
    />
  );
}

/* -------------------------------------------------------- StaggeredLines */
export function StaggeredLines({
  lines,
  className,
  lineClassName,
  delay = 0,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
}) {
  // always render the motion tree (hydration-safe); reduced motion is
  // handled globally by <MotionConfig reducedMotion="user">
  return (
    <div className={className}>
      {lines.map((line, i) => (
        <div key={i} className="overflow-hidden">
          <motion.div
            className={lineClassName}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: delay + i * 0.09, ease: EASE }}
          >
            {line}
          </motion.div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- SectionHead */
export function SectionHead({
  kicker,
  title,
  body,
  dark = true,
  align = "left",
  className,
}: {
  kicker: string;
  title: ReactNode;
  body?: string;
  dark?: boolean;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      <Reveal>
        <p className={cn("kicker flex items-center gap-2.5", align === "center" && "justify-center", dark ? "text-volt" : "text-ink/60")}>
          {align === "left" ? <span className={cn("inline-block h-px w-8", dark ? "bg-volt" : "bg-ink/40")} aria-hidden="true" /> : null}
          {kicker}
        </p>
      </Reveal>
      <h2 className={cn("display-2 mt-5", dark ? "text-ivory" : "text-ink")}>
        {typeof title === "string" ? (
          <WordsReveal text={title} />
        ) : (
          <Reveal delay={0.08}>{title}</Reveal>
        )}
      </h2>
      {body ? (
        <Reveal delay={0.16}>
          <p className={cn("mt-5 max-w-xl text-base leading-relaxed sm:text-lg", dark ? "text-smoke" : "text-graphite", align === "center" && "mx-auto")}>
            {body}
          </p>
        </Reveal>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- VoltButton */
type VoltButtonProps = {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  variant?: "volt" | "outline-light" | "outline-dark" | "ink";
  size?: "md" | "lg";
  className?: string;
  external?: boolean;
  ariaLabel?: string;
};

export function VoltButton({ href, onClick, children, variant = "volt", size = "md", className, external, ariaLabel }: VoltButtonProps) {
  const base = cn(
    "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full font-display font-semibold tracking-tight transition-colors duration-300 active:scale-[0.97] min-h-[44px]",
    size === "lg" ? "px-8 py-4 text-base" : "px-6 py-3 text-sm sm:text-[15px]",
    variant === "volt" && "bg-volt text-ink hover:bg-volt-2",
    variant === "ink" && "bg-ink text-ivory hover:bg-ink-2",
    variant === "outline-light" && "border border-ivory/25 text-ivory hover:border-ivory/60",
    variant === "outline-dark" && "border border-ink/25 text-ink hover:border-ink/60",
    className
  );

  const inner = (
    <>
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 -translate-x-[101%] transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:translate-x-0",
          variant === "volt" && "bg-ink/10",
          variant === "ink" && "bg-volt/15",
          variant === "outline-light" && "bg-white/5",
          variant === "outline-dark" && "bg-ink/5"
        )}
      />
    </>
  );

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={base} aria-label={ariaLabel}>
          {inner}
        </a>
      );
    }
    return (
      <Link href={href} className={base} ariaLabel={ariaLabel}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={base} aria-label={ariaLabel}>
      {inner}
    </button>
  );
}

/* ---------------------------------------------------------------- Magnetic */
export function Magnetic({ children, strength = 0.25, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 180, damping: 14, mass: 0.4 });

  return (
    <motion.div
      ref={ref}
      className={cn("inline-block", className)}
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        if (window.matchMedia("(pointer: coarse)").matches) return;
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        x.set((e.clientX - rect.left - rect.width / 2) * strength);
        y.set((e.clientY - rect.top - rect.height / 2) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------------------------------------------- Marquee */
export function Marquee({ items, dark = true, className }: { items: string[]; dark?: boolean; className?: string }) {
  const list = [...items, ...items];
  return (
    <div className={cn("relative overflow-hidden py-5", dark ? "border-y border-ivory/10 bg-ink" : "border-y border-ink/10 bg-ivory", className)} aria-hidden="true">
      <div className="animate-marquee flex w-max items-center">
        {list.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className={cn("font-display px-6 text-sm font-medium uppercase tracking-[0.18em] sm:text-base", dark ? "text-ivory/70" : "text-ink/60")}>
              {item}
            </span>
            <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", i % 2 === 0 ? "bg-volt" : dark ? "bg-ivory/30" : "bg-ink/30")} />
          </span>
        ))}
      </div>
      <div className={cn("pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r sm:w-24", dark ? "from-ink" : "from-ivory", "to-transparent")} />
      <div className={cn("pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l sm:w-24", dark ? "from-ink" : "from-ivory", "to-transparent")} />
    </div>
  );
}

/* ----------------------------------------------------------------- Counter */
export function Counter({ value, suffix, className }: { value: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const numeric = parseFloat(value);
  const isNumeric = !isNaN(numeric) && isFinite(numeric);
  const [display, setDisplay] = useState(isNumeric ? "0" : value);
  const [seed, setSeed] = useState(value);
  const [inView, setInView] = useState(false);

  // resync when the value prop changes (e.g. content refetch after admin
  // edits) — "adjust state during render" pattern, no effect needed
  if (seed !== value) {
    setSeed(value);
    setDisplay(isNumeric ? "0" : value);
  }

  // shared observer (one for the whole app) instead of a per-element
  // framer useInView — callback is always async, so no sync setState
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stop = onEnterView(el, () => {
      stop();
      setInView(true);
    });
    return stop;
  }, []);

  useEffect(() => {
    if (!inView || !isNumeric) return;
    let raf = 0;
    // reduced motion: show the final value instantly (next frame — avoids
    // synchronous setState in the effect; render stays hydration-stable,
    // server and client both render "0" first)
    if (reduce) {
      raf = requestAnimationFrame(() => setDisplay(String(numeric)));
      return () => cancelAnimationFrame(raf);
    }
    const duration = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(String(Math.round(numeric * eased)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, isNumeric, numeric, reduce]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

/* -------------------------------------------------------------- ParallaxImg */
export function ParallaxImg({
  src,
  alt,
  className,
  imgClassName,
  distance = 40,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  distance?: number;
  priority?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.img
        src={src}
        alt={alt}
        style={reduce ? undefined : { y, scale: 1.18 }}
        className={cn("h-full w-full object-cover", imgClassName)}
        loading={priority ? "eager" : "lazy"}
      />
    </div>
  );
}

/* -------------------------------------------------------------- MediaFrame */
export function MediaFrame({
  src,
  alt,
  ratio = "4/3",
  className,
  imgClassName,
  children,
}: {
  src: string;
  alt: string;
  ratio?: string;
  className?: string;
  imgClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("group/media relative overflow-hidden bg-coal", className)} style={{ aspectRatio: ratio }}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn("h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/media:scale-[1.04]", imgClassName)}
      />
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------- Chip */
export function Chip({ children, dark = true, className }: { children: ReactNode; dark?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[11px] font-medium uppercase tracking-[0.14em]",
        dark ? "border-ivory/15 text-ivory/70" : "border-ink/15 text-ink/60",
        className
      )}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- CTABanner */
export function CTABanner({
  title,
  body,
  buttonLabel,
  whatsappHref,
}: {
  title: string;
  body: string;
  buttonLabel: string;
  whatsappHref?: string;
}) {
  const { settings } = useSite();
  const brand = (settings.brand.name || "Nexora").toUpperCase();

  return (
    <section className="grain relative overflow-hidden bg-ink py-24 sm:py-32">
      <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
      {/* scroll-linked brand watermark drifting behind the copy */}
      <ScrollStrip
        text={brand}
        className="absolute left-0 top-1/2 w-full -translate-y-1/2 text-[17vw] opacity-80"
      />
      <div className="absolute -right-40 top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full bg-volt/10 blur-[140px]" aria-hidden="true" />
      <div className="container-x relative z-10">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Reveal>
              <p className="kicker text-volt">Next Step</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="display-1 mt-6 text-ivory">{title}</h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-smoke sm:text-lg">{body}</p>
            </Reveal>
          </div>
          <Reveal delay={0.2} className="flex flex-wrap items-center gap-4">
            <Magnetic>
              <VoltButton href="/contact" size="lg">
                {buttonLabel}
              </VoltButton>
            </Magnetic>
            {whatsappHref ? (
              <VoltButton href={whatsappHref} variant="outline-light" size="lg" external>
                WhatsApp Us
              </VoltButton>
            ) : null}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- PageHeader */
export function PageHeader({
  kicker,
  title,
  sub,
  meta,
}: {
  kicker: string;
  title: ReactNode;
  sub?: string;
  meta?: string;
}) {
  return (
    <section className="grain relative overflow-hidden bg-ink pb-16 pt-36 sm:pb-20 sm:pt-44">
      <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
      <div className="container-x relative z-10">
        <Reveal>
          <p className="kicker flex items-center gap-2.5 text-volt">
            <span className="inline-block h-px w-8 bg-volt" aria-hidden="true" />
            {kicker}
          </p>
        </Reveal>
        {typeof title === "string" ? (
          <WordsReveal text={title} className="display-1 mt-6 block text-ivory max-w-4xl" stagger={0.07} />
        ) : (
          <StaggeredLines className="mt-6" lines={[title]} lineClassName="display-1 text-ivory max-w-4xl" />
        )}
        {sub ? (
          <Reveal delay={0.2}>
            <p className="mt-7 max-w-2xl text-base leading-relaxed text-smoke sm:text-lg">{sub}</p>
          </Reveal>
        ) : null}
        {meta ? (
          <Reveal delay={0.26}>
            <p className="mt-6 font-display text-xs uppercase tracking-[0.2em] text-ivory/40">{meta}</p>
          </Reveal>
        ) : null}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- Multiline */
export function Multiline({ text, className }: { text: string; className?: string }) {
  return <span className={cn("whitespace-pre-line", className)}>{text}</span>;
}
