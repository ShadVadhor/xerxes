import { useEffect, useRef } from "react";
import { A } from "@/lib/assets";
import { PROGRAMME } from "@/lib/content";
import { requestContact } from "@/lib/interest";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import CampusFilm from "./CampusFilm";
import { Arrow, Eyebrow } from "./ui";

function PhaseDot({ status }: { status: string }) {
  if (status === "Complete")
    return (
      <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-ink">
        <svg width="12" height="9" viewBox="0 0 12 9" fill="none" aria-hidden>
          <path d="M1 4.5l3.2 3L11 1" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>
    );
  if (status === "Standby")
    return (
      <span className="relative grid h-6 w-6 place-items-center rounded-full border border-ember">
        <span className="h-2 w-2 rounded-full bg-ember" />
        <span className="absolute inset-[-6px] animate-ping rounded-full border border-ember/60" />
      </span>
    );
  return <span className="block h-6 w-6 rounded-full border border-dashed border-white/40" />;
}

export default function Programme() {
  const root = useRef<HTMLElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const line = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        img.current,
        { xPercent: -3, scale: 1.08 },
        {
          xPercent: 3,
          scale: 1.08,
          ease: "none",
          scrollTrigger: { trigger: "[data-ksa-band]", start: "top bottom", end: "bottom top", scrub: true },
        }
      );
      gsap.fromTo(
        line.current,
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: "none",
          scrollTrigger: { trigger: "[data-roadmap]", start: "top 80%", end: "bottom 60%", scrub: true },
        }
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="programme" className="relative overflow-hidden bg-obsidian pt-[clamp(5rem,11vw,10rem)]">
      <div className="wrap relative">
        <div className="flex flex-wrap items-center gap-4">
          <Eyebrow>
            <span data-reveal>{PROGRAMME.eyebrow}</span>
          </Eyebrow>
          <span data-reveal className="inline-flex items-center gap-3 rounded-full border border-ember/50 bg-ember/10 px-4 py-1.5">
            <span className="h-2 w-2 rounded-full bg-ember shadow-[0_0_12px_#ffc27a]" />
            <span className="mono text-[0.64rem] uppercase tracking-[0.24em] text-ember">{PROGRAMME.status}</span>
          </span>
        </div>
        <h2 data-reveal className="display mt-6 max-w-[16ch] text-[clamp(2.6rem,6.6vw,6.8rem)] text-white">
          {PROGRAMME.title}
          <br />
          <span className="accent-serif text-magma-grad">{PROGRAMME.titleAccent}</span>
        </h2>
      </div>

      {/* desert band */}
      <div data-ksa-band className="relative mt-14 h-[clamp(300px,46vw,640px)] overflow-hidden">
        <img
          ref={img}
          src={A.ksa}
          alt="The Xerxes campus at dusk on a desert road — waiting on the horizon"
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-obsidian via-obsidian/10 to-obsidian" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-obsidian/70 via-transparent to-obsidian/50" />

        <div className="wrap absolute inset-x-0 bottom-0 pb-6 sm:pb-10">
          <dl className="grid max-w-[880px] grid-cols-2 gap-px border border-white/15 bg-white/10 backdrop-blur-md sm:grid-cols-4">
            {PROGRAMME.statusRows.map(r => (
              <div key={r.k} className="bg-obsidian/70 p-4">
                <dt className="mono text-[0.56rem] uppercase tracking-[0.22em] text-white/45">{r.k}</dt>
                <dd className="mt-2 text-[0.9rem] leading-snug text-white">{r.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="wrap relative mt-14 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p data-reveal className="text-[clamp(1.15rem,1.7vw,1.5rem)] leading-relaxed text-white/85">
            {PROGRAMME.body}
          </p>
          <p data-reveal className="mono mt-6 text-[0.7rem] uppercase tracking-[0.18em] text-white/45">
            {PROGRAMME.humane}
          </p>
        </div>
        <div data-reveal className="flex items-start lg:col-span-5 lg:justify-end">
          <button type="button" className="btn-magma" onClick={() => requestContact("KSA programme updates", "programme")}>
            {PROGRAMME.cta} <Arrow />
          </button>
        </div>
      </div>

      {/* roadmap */}
      <div data-roadmap className="wrap relative mt-[clamp(4rem,8vw,7rem)]">
        <div className="relative">
          <div className="absolute left-3 right-3 top-3 hidden h-px bg-white/15 md:block" />
          <div ref={line} className="absolute left-3 right-3 top-3 hidden h-px origin-left bg-gradient-to-r from-white via-ember to-transparent md:block" style={{ transform: "scaleX(0)" }} />
          <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
            {PROGRAMME.phases.map(p => (
              <li key={p.n} data-reveal className="relative">
                <PhaseDot status={p.status} />
                <div className="mono mt-5 text-[0.6rem] uppercase tracking-[0.24em] text-white/45">Phase {p.n}</div>
                <h3 className="display mt-2 text-[1.5rem] text-white">{p.t}</h3>
                <p className="mt-2 text-[0.92rem] leading-relaxed text-white/58">{p.d}</p>
                <span
                  className={`mono mt-4 inline-block border px-3 py-1 text-[0.58rem] uppercase tracking-[0.22em] ${
                    p.status === "Complete"
                      ? "border-white/60 text-white"
                      : p.status === "Standby"
                        ? "border-ember/60 text-ember"
                        : "border-white/20 text-white/45"
                  }`}
                >
                  {p.status}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p data-reveal className="mono mt-8 text-[0.64rem] tracking-[0.12em] text-white/40">
          Timelines will be re-baselined with our partners on resumption. No dates are committed.
        </p>
      </div>

      {/* resumption protocol */}
      <div className="wrap relative mt-[clamp(4rem,8vw,7rem)]">
        <div className="mono text-[0.66rem] uppercase tracking-[0.24em] text-magma-hi">How we resume</div>
        <ol className="mt-6 grid gap-px border border-white/12 bg-white/10 md:grid-cols-3">
          {PROGRAMME.resume.map(r => (
            <li key={r.n} data-reveal className="group bg-obsidian p-7 transition-colors duration-500 hover:bg-basalt-2 sm:p-9">
              <span className="font-display text-5xl font-bold text-white/15 transition-colors duration-500 group-hover:text-magma">
                {r.n}
              </span>
              <h3 className="display mt-6 text-[1.7rem] text-white">{r.t}</h3>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-white/60">{r.d}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* campus film */}
      <CampusFilm />
    </section>
  );
}
