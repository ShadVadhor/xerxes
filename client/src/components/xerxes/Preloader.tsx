import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { A } from "@/lib/assets";

const SEEN_KEY = "xerxes-intro-seen";

export function shouldPlayIntro() {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  try {
    return !sessionStorage.getItem(SEEN_KEY);
  } catch {
    return true;
  }
}

/** Short brand intro: hexagon draws, counter runs, curtain lifts. */
export default function Preloader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const hex = useRef<SVGPolygonElement>(null);
  const xs = useRef<SVGGElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const word = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // warm the poster so the hero is instant under the curtain
    const img = new Image();
    img.src = A.heroPoster;

    const state = { n: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = prevOverflow;
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
        onDone();
      },
    });
    tl.fromTo(hex.current, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, 0)
      .fromTo(
        xs.current?.children ?? [],
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.7, stagger: 0.08, ease: "power2.out" },
        0.55
      )
      .to(
        state,
        {
          n: 100,
          duration: 1.5,
          ease: "power1.inOut",
          onUpdate: () => {
            if (count.current) count.current.textContent = String(Math.round(state.n)).padStart(3, "0");
          },
        },
        0
      )
      .fromTo(word.current, { opacity: 0, letterSpacing: "0.9em" }, { opacity: 1, letterSpacing: "0.42em", duration: 0.9, ease: "power3.out" }, 0.7)
      .to(root.current?.querySelectorAll("[data-pre-fade]") ?? [], { opacity: 0, duration: 0.35 }, 1.75)
      .to(root.current, { yPercent: -100, duration: 0.95, ease: "power4.inOut" }, 1.9);

    return () => {
      tl.kill();
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} aria-hidden className="fixed inset-0 z-[100] grid place-items-center bg-obsidian text-white">
      <div className="strata-lines absolute inset-0 opacity-40" />
      <div className="relative flex flex-col items-center gap-8">
        <svg width="120" height="132" viewBox="0 0 100 100" fill="none" stroke="#ff5a1f" strokeWidth="1.4" strokeLinejoin="round">
          <polygon ref={hex} pathLength={1} strokeDasharray="1" points="50,3 91,26.5 91,73.5 50,97 9,73.5 9,26.5" />
          <g ref={xs} stroke="#ece8e0" strokeWidth="2">
            <path pathLength={1} strokeDasharray="1" d="M30 36l16 28M46 36L30 64" />
            <path pathLength={1} strokeDasharray="1" d="M54 36l16 28M70 36L54 64" />
          </g>
        </svg>
        <div ref={word} className="font-display text-xl font-bold opacity-0">
          XERXES
        </div>
        <div data-pre-fade className="mono flex items-center gap-4 text-[0.65rem] tracking-[0.3em] text-white/50">
          <span>INITIALISING</span>
          <span ref={count} className="text-magma-hi">
            000
          </span>
        </div>
      </div>
    </div>
  );
}
