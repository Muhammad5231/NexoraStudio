// ---------------------------------------------------------------------------
// Shared IntersectionObserver for scroll-triggered reveals.
//
// The previous system created ONE IntersectionObserver PER animated element
// (framer-motion's whileInView / useInView). With ~90 reveals on the home
// page that meant ~90 observers + framer animation subscriptions — heavy on
// the main thread, and if any single observer lifecycle ever missed (route
// remounts through AnimatePresence, HMR churn during development, hydration
// timing) its element stayed stuck at opacity:0 forever, i.e. the reported
// "scroll animations randomly stop working / only work on mobile".
//
// This module gives the whole app ONE observer. Combined with the synchronous
// isInViewport() fallback and the JS-only hidden state (see primitives.tsx),
// an element can never remain hidden: worst case it appears without an
// animation, never invisible.
// ---------------------------------------------------------------------------

let shared: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, Set<() => void>>();

function ensureShared(): IntersectionObserver | null {
  if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return null;
  if (!shared) {
    shared = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const set = callbacks.get(entry.target);
          if (!set) {
            shared?.unobserve(entry.target);
            continue;
          }
          // copy before iterating — a callback may dispose itself mid-loop
          for (const cb of Array.from(set)) cb();
        }
      },
      // Trigger a touch before the element reaches the bottom edge. The small
      // negative strip is safe: every view ends with the footer, so no reveal
      // element can be permanently trapped below the trigger line.
      { rootMargin: "0px 0px -8% 0px", threshold: 0 }
    );
  }
  return shared;
}

/** True when `el` currently intersects the viewport (synchronous check). */
export function isInViewport(el: Element, slack = 0): boolean {
  if (typeof window === "undefined") return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom > slack && rect.top < vh - slack && rect.right > slack && rect.left < vw - slack;
}

/**
 * Fires `cb` when `el` enters the viewport. Returns a disposer.
 * If IntersectionObserver is unavailable, `cb` fires on the next animation
 * frame — callers must treat "no API" as "never hide anything".
 */
export function onEnterView(el: Element, cb: () => void): () => void {
  const obs = ensureShared();
  if (!obs) {
    const raf = requestAnimationFrame(() => cb());
    return () => cancelAnimationFrame(raf);
  }
  let set = callbacks.get(el);
  if (!set) {
    set = new Set();
    callbacks.set(el, set);
  }
  set.add(cb);
  obs.observe(el);
  return () => {
    const s = callbacks.get(el);
    if (s) {
      s.delete(cb);
      if (s.size === 0) {
        callbacks.delete(el);
        obs.unobserve(el);
      }
    }
  };
}
