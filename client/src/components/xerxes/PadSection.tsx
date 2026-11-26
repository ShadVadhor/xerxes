import { useEffect, useRef } from "react";
import { PAD_SECTION } from "@/lib/content";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { Eyebrow } from "./ui";
import WellPadAnatomy from "./WellPadAnatomy";

/** The Xerxes well pad as a stand-alone chapter between the descent and the data hall. */
export default function PadSection() {
  const root = useRef<HTMLElement>(null);
  const p = PAD_SECTION;

  useEffect(() => {
    if (prefersReducedMotion() || !root.current) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-pad-in]", {
        y: 36,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="well-pad" aria-labelledby="pad-h" className="relative overflow-hidden bg-obsidian py-[clamp(5rem,10vw,9rem)] text-white">
      <div className="strata-lines absolute inset-0 opacity-25" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 h-1/2" style={{ background: "radial-gradient(70% 90% at 70% 100%, rgba(255,90,31,0.16), transparent 70%)" }} aria-hidden />
      <div className="wrap relative grid gap-12 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5 lg:pt-6">
          <div data-pad-in>
            <Eyebrow className="text-white/60">{p.eyebrow}</Eyebrow>
          </div>
          <h2 id="pad-h" data-pad-in className="display mt-5 text-[clamp(2.6rem,5.6vw,5.4rem)]">
            {p.title}
            <br />
            <span className="accent-serif text-magma-hi">{p.titleAccent}</span>
          </h2>
          <p data-pad-in className="mt-6 max-w-[48ch] text-[1.02rem] leading-relaxed text-white/70">
            {p.intro}
          </p>
          <ul data-pad-in className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {p.parts.map(part => (
              <li key={part.k} className="py-3.5">
                <div className="font-display text-[1.02rem] font-semibold">{part.k}</div>
                <p className="mt-1 text-[0.88rem] leading-snug text-white/60">{part.v}</p>
              </li>
            ))}
          </ul>
          <dl data-pad-in className="mt-8 grid grid-cols-3 gap-4">
            {p.figures.map(f => (
              <div key={f.label}>
                <dd className="font-display text-[clamp(1.6rem,2.8vw,2.4rem)] font-semibold leading-none">
                  {f.value}
                  <span className="ml-1 text-[0.5em] font-medium text-magma-hi">{f.unit}</span>
                </dd>
                <dt className="mono mt-2 text-[0.55rem] uppercase leading-snug tracking-[0.14em] text-white/45">{f.label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div data-pad-in className="lg:col-span-7">
          <WellPadAnatomy variant="xerxes" />
          <p className="mono mt-3 text-[0.58rem] uppercase leading-relaxed tracking-[0.16em] text-white/45">{p.footnote}</p>
        </div>
      </div>
    </section>
  );
}
