"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/lib/router";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared editorial primitives for the public site. Keep these cohesive —
// every view composes from here.
// ---------------------------------------------------------------------------

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ------------------------------------------------------------------ Reveal */
export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
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
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={className}>
        {lines.map((l, i) => (
          <div key={i} className={lineClassName}>
            {l}
          </div>
        ))}
      </div>
    );
  }
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
      <Reveal delay={0.08}>
        <h2 className={cn("display-2 mt-5", dark ? "text-ivory" : "text-ink")}>{title}</h2>
      </Reveal>
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
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const numeric = parseFloat(value);
  const isNumeric = !isNaN(numeric) && isFinite(numeric);
  const [display, setDisplay] = useState(isNumeric ? "0" : value);
  const [seed, setSeed] = useState(value);

  // resync when the value prop changes (e.g. content refetch after admin
  // edits) — "adjust state during render" pattern, no effect needed
  if (seed !== value) {
    setSeed(value);
    setDisplay(isNumeric ? "0" : value);
  }

  useEffect(() => {
    if (!inView || !isNumeric || reduce) return;
    const duration = 1200;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(String(Math.round(numeric * eased)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, isNumeric, numeric, reduce]);

  const shown = reduce && isNumeric ? String(numeric) : display;

  return (
    <span ref={ref} className={className}>
      {shown}
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
  return (
    <section className="grain relative overflow-hidden bg-ink py-24 sm:py-32">
      <div className="bg-grid-dark absolute inset-0" aria-hidden="true" />
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
        <StaggeredLines className="mt-6" lines={[title]} lineClassName="display-1 text-ivory max-w-4xl" />
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
