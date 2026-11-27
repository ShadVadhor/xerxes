import { useEffect, useRef } from "react";
import { Link } from "wouter";
import { A } from "@/lib/assets";
import { gsap } from "@/lib/smooth";
import { Arrow, Eyebrow } from "./ui";

const FACTS = [
  { v: "11", l: "Stops, hub to roof" },
  { v: "6 + 6", l: "Pods and wells in view" },
  { v: "5 km", l: "Down to the rock" },
];

/** Entry band for the interactive 3D walkthrough (`/walkthrough`). */
export default function WalkTeaser() {
  const root = useRef<HTMLElement>(null);
  const main = useRef<HTMLDivElement>(null);
  const side = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        main.current,
        { clipPath: "inset(12% 10% 12% 10%)" },
        { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: main.current, start: "top 95%", end: "top 35%", scrub: 0.6 } }
      );
      gsap.fromTo(
        side.current,
        { yPercent: 14 },
        { yPercent: -10, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: 0.8 } }
      );
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="walkthrough" aria-labelledby="walk-h" className="relative overflow-hidden bg-obsidian py-[clamp(5rem,10vw,9rem)]">
      <div className="strata-lines pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
      <div className="wrap relative grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <Eyebrow>
            <span data-reveal>Interactive · 3D</span>
          </Eyebrow>
          <h2 id="walk-h" data-reveal className="display mt-6 text-[clamp(2.3rem,4.5vw,4.5rem)] text-white">
            Walk the pod.
            <br />
            <span className="accent-serif text-magma-hi">Then go five kilometres down.</span>
          </h2>
          <p data-reveal className="mt-7 max-w-[46ch] text-[1.02rem] leading-relaxed text-ceramic/75">
            A guided flight through one Xerxes production pod: the hub and its digital twin, the compute hall, the low-water CO₂ cooling plant, the NanoVault, the wellheads, 120 branches in the rock and the roof that works. Or take the controls and explore it yourself.
          </p>
          <dl data-reveal className="mt-9 grid max-w-md grid-cols-3 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10">
            {FACTS.map(f => (
              <div key={f.l} className="bg-obsidian px-4 py-4">
                <dt className="display text-[1.5rem] leading-none text-white">{f.v}</dt>
                <dd className="mono mt-2 text-[0.52rem] uppercase leading-snug tracking-[0.12em] text-ceramic/55">{f.l}</dd>
              </div>
            ))}
          </dl>
          <div data-reveal className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href="/walkthrough" className="btn-magma">
              Enter the walkthrough <Arrow />
            </Link>
            <span className="mono text-[0.58rem] uppercase tracking-[0.14em] text-ceramic/45">Runs in your browser · schematic scale · design targets</span>
          </div>
        </div>

        <div className="relative lg:col-span-7">
          <Link href="/walkthrough" tabIndex={-1} aria-hidden="true" className="group relative block">
            <div ref={main} className="relative aspect-[16/10] overflow-hidden rounded-sm border border-white/10 bg-black">
              <img src={A.walkHall} alt="Rendered view down a Xerxes compute hall, in the 3D walkthrough" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.04]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" aria-hidden="true" />
              <span className="mono absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/55 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.16em] text-ceramic/90 backdrop-blur-md">
                <span className="pulse-dot" aria-hidden="true" /> Live 3D
              </span>
              <span className="mono absolute bottom-4 left-4 text-[0.58rem] uppercase tracking-[0.16em] text-ceramic/80">Stop 04 · The hall</span>
              <span className="absolute bottom-4 right-4 grid h-14 w-14 place-items-center rounded-full bg-white text-obsidian transition-transform duration-500 group-hover:scale-110" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
              </span>
            </div>
          </Link>
          <div ref={side} className="absolute -bottom-8 -left-4 hidden w-[34%] overflow-hidden rounded-sm border border-white/15 bg-black shadow-[0_30px_60px_-20px_rgba(0,0,0,.8)] sm:block lg:-left-14" aria-hidden="true">
            <img src={A.walkCampus} alt="" loading="lazy" decoding="async" className="aspect-[16/10] w-full object-cover" />
            <span className="mono absolute left-3 top-3 text-[0.5rem] uppercase tracking-[0.16em] text-ceramic/80">Campus · 6 pods</span>
          </div>
        </div>
      </div>
    </section>
  );
}
