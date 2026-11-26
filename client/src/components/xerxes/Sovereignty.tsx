import { useEffect, useRef } from "react";
import { A } from "@/lib/assets";
import { SECURITY } from "@/lib/content";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { Eyebrow } from "./ui";

export default function Sovereignty() {
  const root = useRef<HTMLElement>(null);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        img.current,
        { yPercent: -8, scale: 1.12 },
        {
          yPercent: 8,
          scale: 1.02,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="security" className="relative isolate overflow-hidden bg-obsidian py-[clamp(5rem,11vw,10rem)]">
      <img
        ref={img}
        src={A.perimeter}
        alt=""
        aria-hidden
        loading="lazy"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-obsidian via-obsidian/80 to-obsidian/30" />
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-obsidian to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-obsidian to-transparent" />
      <div aria-hidden className="scanline -z-10 opacity-60" />

      <div className="wrap relative grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <Eyebrow>
            <span data-reveal>{SECURITY.eyebrow}</span>
          </Eyebrow>
          <h2 data-reveal className="display mt-6 text-[clamp(2.6rem,6.2vw,6.2rem)] text-white">
            {SECURITY.title}
            <br />
            <span className="accent-serif text-magma-grad">{SECURITY.titleAccent}</span>
          </h2>
          <p data-reveal className="mt-8 max-w-[46ch] text-[1.05rem] leading-relaxed text-white/68">
            {SECURITY.intro}
          </p>
          <div data-reveal className="mt-10 inline-flex items-center gap-4 border border-white/15 bg-black/30 px-5 py-4 backdrop-blur-md">
            <span className="pulse-dot" />
            <span className="mono text-[0.68rem] uppercase tracking-[0.22em] text-white/80">{SECURITY.control}</span>
          </div>
        </div>

        <ol className="lg:col-span-6 lg:pt-6">
          {SECURITY.pillars.map((p, i) => (
            <li
              key={p.t}
              data-reveal
              className="group relative grid grid-cols-[3rem_1fr] gap-x-4 border-t border-white/15 py-7 transition-colors duration-500 last:border-b hover:border-magma"
            >
              <span className="mono pt-1 text-[0.7rem] tracking-[0.2em] text-magma-hi">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="display text-[clamp(1.5rem,2.6vw,2.4rem)] text-white transition-transform duration-500 group-hover:translate-x-2">
                  {p.t}
                </h3>
                <p className="mt-2 max-w-[44ch] text-[0.98rem] leading-relaxed text-white/62">{p.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
