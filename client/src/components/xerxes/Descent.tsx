import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { A } from "@/lib/assets";
import { DESCENT } from "@/lib/content";
import { prefersReducedMotion, ScrollTrigger } from "@/lib/smooth";
import { LazyMount, SceneBoundary } from "./ui";

const DescentScene = lazy(() => import("./DescentScene"));

/** Progress at which each text step begins — matches the scene's camera beats */
const BEATS = [0, 0.12, 0.24, 0.38, 0.53, 0.7, 0.88];

export default function Descent() {
  const outer = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const fill = useRef<HTMLDivElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  // Reduced-motion visitors get the still cutaway instead of the camera-driven scene
  const [noGl, setNoGl] = useState(() => prefersReducedMotion());

  useEffect(() => {
    let current = 0;
    const st = ScrollTrigger.create({
      trigger: outer.current,
      start: "top top",
      end: "bottom bottom",
      onUpdate: self => {
        const p = self.progress;
        progress.current = p;
        let s = 0;
        BEATS.forEach((b, i) => {
          if (p >= b) s = i;
        });
        if (s !== current) {
          current = s;
          setStep(s);
        }
        if (fill.current) fill.current.style.transform = `scaleY(${p})`;
        if (cue.current) cue.current.style.opacity = String(Math.max(0, 1 - p * 18));
      },
    });
    return () => st.kill();
  }, []);

  const s = DESCENT.steps[step];

  return (
    <section ref={outer} id="technology" className="relative bg-obsidian" style={{ height: "720vh" }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* scene */}
        <div className="absolute inset-0">
          {noGl ? (
            <img src={A.wells} alt="Cutaway of the geothermal well field beneath the campus" className="h-full w-full object-cover" />
          ) : (
            <LazyMount className="absolute inset-0" rootMargin="1400px">
              <SceneBoundary onError={() => setNoGl(true)}>
                <Suspense fallback={null}>
                  <DescentScene progressRef={progress} onUnsupported={() => setNoGl(true)} />
                </Suspense>
              </SceneBoundary>
            </LazyMount>
          )}
        </div>

        {/* grading for legibility */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-obsidian/85 via-obsidian/35 to-transparent lg:w-[62%]" />
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-obsidian/80 to-transparent lg:hidden" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-obsidian/70 to-transparent" />
        </div>

        {/* heading */}
        <div className="wrap absolute inset-x-0 top-24 z-10">
          <div className="eyebrow flex items-center gap-3 text-white/60">
            <span className="inline-block h-px w-8 bg-magma" />
            {DESCENT.eyebrow}
          </div>
        </div>

        {/* step copy */}
        <div className="wrap absolute inset-x-0 bottom-0 z-10 pb-10 sm:pb-14 lg:top-1/2 lg:bottom-auto lg:-translate-y-[45%] lg:pb-0">
          <div key={step} className="max-w-[560px] animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="mono flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.68rem] uppercase tracking-[0.22em] text-magma-hi">
              <span className="whitespace-nowrap">
                {String(step + 1).padStart(2, "0")} / {String(DESCENT.steps.length).padStart(2, "0")}
              </span>
              <span className="hidden h-px w-10 bg-magma/60 sm:block" />
              <span>{s.tag}</span>
            </div>
            <h2 className="display mt-5 text-[clamp(2.3rem,5.6vw,5.4rem)] text-white">{s.title}</h2>
            <p className="mt-5 max-w-[46ch] text-[1.02rem] leading-relaxed text-white/72">{s.body}</p>
            {s.stat && (
              <div className="mt-7 flex items-baseline gap-3 border-t border-white/15 pt-5">
                <span className={`font-display whitespace-nowrap font-bold leading-none text-magma-grad ${s.stat.value.length > 3 ? "text-[clamp(2.8rem,6vw,5.6rem)]" : "text-[clamp(3.6rem,8vw,7.5rem)]"}`}>{s.stat.value}</span>
                <span className="font-display text-3xl font-semibold text-white">{s.stat.unit}</span>
                <span className="mono ml-2 text-[0.64rem] uppercase tracking-[0.2em] text-white/55">{s.stat.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* progress gauge */}
        <div className="absolute right-5 top-1/2 z-10 hidden h-[46vh] -translate-y-1/2 md:block lg:right-8" aria-hidden>
          <div className="relative h-full w-px bg-white/20">
            <div ref={fill} className="absolute inset-0 origin-top bg-gradient-to-b from-magma-hi to-magma" style={{ transform: "scaleY(0)" }} />
            {DESCENT.steps.map((d, i) => (
              <div key={d.tag} className="absolute right-0 flex -translate-y-1/2 items-center gap-3" style={{ top: `${BEATS[i] * 100}%` }}>
                <span className={`mono whitespace-nowrap text-[0.56rem] uppercase tracking-[0.2em] transition-colors duration-500 ${i === step ? "text-white" : "text-white/30"}`}>
                  {d.tag}
                </span>
                <span className={`block h-[7px] w-[7px] rounded-full transition-all duration-500 ${i <= step ? "bg-magma shadow-[0_0_10px_#ff5a1f]" : "bg-white/30"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* scroll cue */}
        <div ref={cue} className="mono pointer-events-none absolute bottom-6 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-3 text-[0.6rem] uppercase tracking-[0.3em] text-white/55 sm:flex">
          Scroll to descend
          <span className="relative block h-8 w-px overflow-hidden bg-white/20">
            <span className="absolute inset-x-0 top-0 h-3 bg-white" style={{ animation: "cue-drop 1.8s ease-in-out infinite" }} />
          </span>
        </div>

        <p className="mono absolute bottom-3 right-5 z-10 hidden text-[0.56rem] tracking-[0.12em] text-white/35 lg:block">{DESCENT.footnote}</p>
      </div>
    </section>
  );
}
