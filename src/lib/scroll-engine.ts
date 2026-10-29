// ---------------------------------------------------------------------------
// Shared scroll engine for scroll-LINKED animations (progress bar, parallax,
// fill text, media zooms, brand strips, process line, hero drift).
//
// Why this exists: these effects were framer-motion useScroll()-driven, whose
// cached element measurements + internal scroll scheduler can silently die in
// a long-lived tab (HMR/Fast-Refresh churn, layout shifts from images/fonts/
// admin content refetches, accordion height changes) — elements freeze at a
// stale progress value, i.e. the reported "scroll animations randomly stop
// working, mostly on desktop". Framer also created one scroll subscription
// per component (~a dozen on the home view alone).
//
// This engine cannot miss:
//   * every active frame re-reads LIVE geometry (getBoundingClientRect +
//     scrollY — no cached offsets to go stale),
//   * every scroll / resize / document-size change re-kicks the loop,
//   * a throwing subscriber is skipped with a one-time warning instead of
//     killing the loop (self-healing),
//   * the loop only runs while scrolling or while a subscriber is still
//     converging — zero idle cost.
// Transform/opacity writes are direct style writes (no React re-render).
//
// framer-motion remains responsible for TIME-BASED animation only (entrances,
// view transitions, mouse springs) where it is rock solid.
// ---------------------------------------------------------------------------

export interface ScrollFrame {
  /** window.scrollY */
  y: number;
  /** viewport height (px) */
  vh: number;
  /** viewport width (px) */
  vw: number;
  /** full document scroll height (px) */
  docH: number;
  /** 0..1 whole-page scroll progress */
  page: number;
}

/** Return `true` from apply to request more frames (e.g. mid-convergence). */
type Apply = (frame: ScrollFrame) => boolean | void;

const subs = new Set<Apply>();
const warned = new WeakSet<Apply>();

let raf = 0;
let lastKick = 0;
let listening = false;
let ro: ResizeObserver | null = null;
let frame: ScrollFrame = { y: 0, vh: 1, vw: 1, docH: 1, page: 0 };

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function measure(): void {
  const y = window.scrollY || window.pageYOffset || 0;
  const vh = window.innerHeight || 1;
  const vw = window.innerWidth || 1;
  const docH = Math.max(document.documentElement.scrollHeight, vh + 1);
  frame = { y, vh, vw, docH, page: clamp01(y / Math.max(1, docH - vh)) };
}

function safeApply(apply: Apply): boolean | void {
  try {
    return apply(frame);
  } catch (err) {
    if (!warned.has(apply)) {
      warned.add(apply);
      console.warn("[scroll-engine] subscriber failed; skipped", err);
    }
  }
}

function run(): void {
  raf = 0;
  measure();
  let more = false;
  for (const apply of Array.from(subs)) {
    if (safeApply(apply)) more = true;
  }
  // keep animating while the user is actively scrolling OR a subscriber is
  // mid-flight (lerp convergence); stop otherwise to save battery
  if (subs.size > 0 && (more || performance.now() - lastKick < 140)) {
    raf = requestAnimationFrame(run);
  }
}

function kick(): void {
  lastKick = performance.now();
  if (!raf && subs.size > 0) raf = requestAnimationFrame(run);
}

function listen(): void {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick, { passive: true });
  // layout shifts (images, fonts, accordions, view transitions, admin
  // refetches) change geometry — re-run so nothing freezes at a stale value
  if (typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(kick);
    ro.observe(document.documentElement);
    if (document.body) ro.observe(document.body);
  }
}

/**
 * Subscribe `apply` to the shared scroll loop. `apply` receives a fresh
 * ScrollFrame each active frame; return `true` to request more frames (e.g.
 * while a lerp is still converging). Returns a disposer.
 *
 * The first application happens synchronously (useLayoutEffect timing) so a
 * newly mounted element is correct before its first paint.
 */
export function trackScroll(apply: Apply): () => void {
  if (typeof window === "undefined") return () => {};
  listen();
  subs.add(apply);
  measure(); // sync first application — correct state before first paint
  safeApply(apply);
  kick();
  return () => {
    subs.delete(apply);
  };
}

export type ScrollEdge = { edge: "start" | "end"; at: number };

/**
 * 0..1 progress of `el` through the viewport for a framer-motion-style offset
 * pair, computed from LIVE geometry every call. `{edge:"start",at:0.92}` means
 * progress 0 when the element's top edge sits at 92% of the viewport height;
 * `{edge:"end",at:0.55}` means progress 1 when its bottom edge sits at 55%.
 */
export function elementProgress(
  el: Element,
  f: ScrollFrame,
  from: ScrollEdge,
  to: ScrollEdge,
): number {
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return 0;
  const d0 = from.at * f.vh - (from.edge === "start" ? rect.top : rect.bottom);
  const d1 = to.at * f.vh - (to.edge === "start" ? rect.top : rect.bottom);
  const span = d0 - d1;
  if (span === 0) return 0;
  return clamp01(d0 / span);
}

/** Exponential smoothing step — framer-spring-like feel without springs. */
export function damp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}
