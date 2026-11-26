import { useEffect, useRef } from "react";
import { COMPANY } from "@/lib/content";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { Eyebrow } from "./ui";

function Monogram({ name }: { name: string }) {
  const parts = name.replace(/^Dr\.\s*/, "").split(" ");
  const initials = `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return (
    <svg viewBox="0 0 70 80" className="h-20 w-[70px] shrink-0 text-magma/65 transition-colors duration-500 group-hover:text-magma-hi" aria-hidden="true">
      <path d="M35 2 68 21v38L35 78 2 59V21Z" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <path d="M35 9 62 24v32L35 71 8 56V24Z" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <text x="35" y="45" textAnchor="middle" fill="currentColor" className="font-display text-[19px] font-semibold">{initials}</text>
    </svg>
  );
}

export default function Company() {
  const dotRef = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const dot = dotRef.current;
    if (!dot || prefersReducedMotion()) return;
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
    timeline
      .set(dot, { attr: { cx: 115, cy: 12 }, opacity: 0 })
      .to(dot, { opacity: 1, duration: 0.4 })
      .to(dot, { attr: { cx: 275, cy: 12 }, duration: 1.3, ease: "none" })
      .to(dot, { attr: { cx: 335, cy: 60 }, duration: 0.6, ease: "none" })
      .to(dot, { attr: { cx: 610, cy: 60 }, duration: 2.2, ease: "none" })
      .to(dot, { attr: { cx: 670, cy: 108 }, duration: 0.6, ease: "none" })
      .to(dot, { attr: { cx: 900, cy: 108 }, duration: 1.8, ease: "none" })
      .to(dot, { opacity: 0, duration: 0.5 });
    return () => { timeline.kill(); };
  }, []);

  const missionParts = COMPANY.mission.split(/(sustainable computing power)/);
  const offsets = ["lg:mt-0", "lg:mt-12", "lg:mt-24"];

  return (
    <section id="company" aria-labelledby="company-heading" className="relative isolate overflow-hidden bg-obsidian py-24 sm:py-32 lg:py-40">
      <div className="strata-lines pointer-events-none absolute inset-0 -z-10 opacity-20 [mask-image:linear-gradient(to_bottom,transparent,black_30%,transparent)]" aria-hidden="true" />
      <div className="wrap">
        <div data-reveal><Eyebrow>{COMPANY.eyebrow}</Eyebrow></div>
        <h2 id="company-heading" className="display mt-9 max-w-[1200px] text-[clamp(2.6rem,6.4vw,6.2rem)]" data-reveal>
          {missionParts.map((part, index) => part === "sustainable computing power"
            ? <span key={index} className="accent-serif text-magma-grad">{part}</span>
            : <span key={index}>{part}</span>)}
        </h2>
        <div className="mt-9 flex items-start gap-5 sm:mt-12" data-reveal data-reveal-delay="0.1">
          <span className="mt-3 h-px w-10 shrink-0 bg-magma/70" aria-hidden="true" />
          <p className="max-w-[56ch] text-[1.05rem] leading-relaxed text-muted-foreground">{COMPANY.vision}</p>
        </div>

        <div className="mt-24 border-t border-border pt-10 lg:mt-32">
          <h3 className="font-display text-[clamp(1.8rem,3.6vw,3.4rem)] font-semibold tracking-[-0.035em]" data-reveal>{COMPANY.title}</h3>
          <div className="relative mt-12 lg:pt-8">
            <svg viewBox="0 0 1000 120" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-0 top-0 hidden h-[120px] w-full overflow-visible lg:block" fill="none" aria-hidden="true">
              <path d="M115 12H275L335 60H610L670 108H900" stroke="var(--color-magma)" strokeWidth="0.8" opacity="0.3" />
              {[{ x: 115, y: 12 }, { x: 450, y: 60 }, { x: 790, y: 108 }].map(point => (
                <g key={point.x}><circle cx={point.x} cy={point.y} r="5" fill="var(--color-obsidian)" stroke="var(--color-magma)" strokeWidth="0.8" /><circle cx={point.x} cy={point.y} r="1.5" fill="var(--color-magma)" /></g>
              ))}
              <circle ref={dotRef} cx="115" cy="12" r="3" fill="var(--color-magma-hi)" style={{ filter: "drop-shadow(0 0 5px #ff5a1f)" }} />
            </svg>
            <div className="grid gap-5 lg:grid-cols-3 lg:gap-8">
              {COMPANY.entities.map((entity, index) => (
                <article key={entity.name} className={`group relative self-start border border-border bg-basalt/75 p-7 transition-colors duration-500 hover:border-magma/65 sm:p-9 ${offsets[index]}`} data-reveal data-reveal-delay={String(index * 0.1)}>
                  <span className="absolute -left-px top-8 h-10 w-px bg-magma transition-all duration-500 group-hover:h-20" aria-hidden="true" />
                  <p className="font-display text-[clamp(4.7rem,7.7vw,8rem)] font-bold leading-none tracking-[-0.065em] text-transparent transition-all duration-500 group-hover:[-webkit-text-stroke-color:rgba(255,90,31,0.55)]" style={{ WebkitTextStroke: "1px rgba(236,232,224,0.24)" }}>{entity.year}</p>
                  <h4 className="mt-8 max-w-[12ch] font-display text-[1.8rem] font-semibold leading-tight tracking-[-0.035em]">{entity.name}</h4>
                  <p className="mono mt-4 text-[0.65rem] uppercase tracking-[0.15em] text-magma-hi">{entity.place}</p>
                  <p className="mt-8 max-w-[32ch] border-t border-border pt-5 text-sm leading-relaxed text-muted-foreground">{entity.role}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-20 grid border-t border-border sm:grid-cols-2 lg:mt-28 lg:grid-cols-3">
          {COMPANY.leaders.map((leader, index) => (
            <article key={leader.name} className="group flex items-start gap-5 border-b border-border py-8 pr-4 transition-colors duration-500 hover:border-magma/70 sm:py-10 lg:gap-6" data-reveal data-reveal-delay={String((index % 3) * 0.08)}>
              <Monogram name={leader.name} />
              <div className="min-w-0 pt-2">
                <h3 className="font-display text-xl font-semibold leading-tight tracking-[-0.03em] sm:text-[1.35rem]">{leader.name}</h3>
                <p className="mono mt-3 max-w-[30ch] text-[0.65rem] leading-relaxed tracking-[0.04em] text-muted-foreground">{leader.role}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
