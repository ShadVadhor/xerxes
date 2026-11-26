import { useEffect, useMemo, useRef } from "react";
import { MANIFESTO, MARQUEE } from "@/lib/content";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { CountUp, Eyebrow } from "./ui";

const ACCENT = new Set(["power", "plant:", "Just", "intelligence,", "at", "scale."]);

export default function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const words = useMemo(() => MANIFESTO.text.split(" "), []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const spans = gsap.utils.toArray<HTMLElement>("[data-word]");
      gsap.fromTo(
        spans,
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.5,
          scrollTrigger: {
            trigger: "[data-manifesto-text]",
            start: "top 78%",
            end: "bottom 45%",
            scrub: 0.6,
          },
        }
      );
      gsap.to("[data-manifesto-glow]", {
        yPercent: -30,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="why" className="relative overflow-hidden bg-obsidian">
      <div
        data-manifesto-glow
        aria-hidden
        className="pointer-events-none absolute -right-[20vw] top-[10%] h-[70vw] w-[70vw] rounded-full bg-[radial-gradient(closest-side,rgba(255,90,31,0.16),transparent)]"
      />
      <div className="strata-lines pointer-events-none absolute inset-0 opacity-50" />

      {/* marquee */}
      <div aria-hidden className="relative overflow-hidden border-y border-white/10 py-4">
        <div className="marquee-track flex w-max items-center">
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={i} className="mono flex items-center whitespace-nowrap text-[0.7rem] tracking-[0.3em] text-white/45">
              {m}
              <span className="mx-8 inline-block h-[6px] w-[6px] rotate-45 bg-magma" />
            </span>
          ))}
        </div>
      </div>

      <div className="wrap relative py-[clamp(5rem,12vw,11rem)]">
        <Eyebrow>
          <span data-reveal>{MANIFESTO.eyebrow}</span>
        </Eyebrow>
        <p
          data-manifesto-text
          className="display mt-10 max-w-[22ch] text-[clamp(2rem,5.4vw,5.4rem)] !leading-[1.04] !tracking-[-0.03em] text-white sm:max-w-[26ch] lg:max-w-[30ch]"
          aria-label={MANIFESTO.text}
        >
          {words.map((w, i) => {
            const accent = ACCENT.has(w);
            return (
              <span key={i} data-word aria-hidden className={`inline-block ${accent ? "text-magma" : ""} mr-[0.26em]`}>
                {w}
              </span>
            );
          })}
        </p>

        <dl className="mt-[clamp(4rem,9vw,8rem)] grid grid-cols-2 gap-x-6 gap-y-10 border-t border-white/12 pt-10 lg:grid-cols-4">
          {MANIFESTO.stats.map(s => (
            <div key={s.label} data-reveal>
              <dt className="mono text-[0.66rem] uppercase tracking-[0.2em] text-white/50">{s.label}</dt>
              <dd className="mt-3">
                <span className="font-display text-[clamp(3rem,7vw,6.5rem)] font-bold leading-none tracking-tight text-white">
                  <CountUp value={s.value} suffix={s.suffix} />
                </span>
                <span className="mono mt-2 block text-[0.62rem] uppercase tracking-[0.2em] text-magma-hi">{s.sub}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mono mt-10 text-[0.62rem] tracking-[0.12em] text-white/35">{MANIFESTO.footnote}</p>
      </div>
    </section>
  );
}
