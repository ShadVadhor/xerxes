import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;
let tick: ((time: number) => void) | null = null;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Start Lenis smooth scrolling and keep GSAP ScrollTrigger in sync. Returns a cleanup. */
export function startSmooth(): () => void {
  if (lenis || prefersReducedMotion()) return () => {};
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
  lenis.on("scroll", ScrollTrigger.update);
  tick = (time: number) => lenis?.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    if (tick) gsap.ticker.remove(tick);
    lenis?.destroy();
    lenis = null;
    tick = null;
  };
}

export function getLenis() {
  return lenis;
}

export function stopScroll() {
  lenis?.stop();
}

export function resumeScroll() {
  lenis?.start();
}

/** Smoothly scroll to a section by id (falls back to native scrolling). */
export function scrollToId(id: string, offset = 0) {
  const el = id === "top" ? document.body : document.getElementById(id);
  if (!el) return;
  if (lenis) {
    lenis.scrollTo(id === "top" ? 0 : el, { offset, duration: 1.6 });
  } else {
    const y = id === "top" ? 0 : el.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
}

export { gsap, ScrollTrigger };
