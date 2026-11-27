import { useEffect, useRef } from "react";
import { IMPACT, SITE } from "@/lib/content";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { CountUp, Eyebrow } from "./ui";

// These two chart keys are the interface labels requested for the comparison.
const COMPARISON = { industry: "Conventional AI data center", xerxes: `${SITE.name[0]}${SITE.name.slice(1).toLowerCase()}` };

function ComparisonChart() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const chart = ref.current;
    if (!chart) return;
    const bars = chart.querySelectorAll<HTMLElement>("[data-impact-bar]");
    if (prefersReducedMotion()) { gsap.set(bars, { scaleX: 1 }); return; }
    // Transform-based growth avoids relayout while achieving each canonical width.
    gsap.set(bars, { scaleX: 0 });
    let tween: gsap.core.Tween | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      tween = gsap.to(bars, { scaleX: 1, duration: 1.6, ease: "power3.out", stagger: 0.15 });
    }, { threshold: 0.2 });
    observer.observe(chart);
    return () => { observer.disconnect(); tween?.kill(); };
  }, []);

  return (
    <div ref={ref} role="img" aria-label={IMPACT.bars.map(row => `${row.label}: ${COMPARISON.industry} ${row.industry.text}; ${COMPARISON.xerxes} ${row.xerxes.text}${"alt" in row && row.alt ? `; ${row.alt.label} ${row.alt.text}` : ""}`).join(". ")} className="min-w-0">
      <div className="space-y-9 sm:space-y-10">
        {IMPACT.bars.map(row => {
          const negative = "negative" in row.xerxes && row.xerxes.negative;
          const zero = row.xerxes.pct === 0;
          const alt = "alt" in row ? row.alt : undefined;
          const note = "note" in row ? row.note : undefined;
          return (
            <div key={row.label} className="grid gap-5 border-t border-border pt-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] md:gap-8">
              <h3 className="mono max-w-[23ch] text-[0.68rem] uppercase leading-relaxed tracking-[0.16em] text-muted-foreground md:pt-0.5">{row.label}</h3>
              <div className="min-w-0 space-y-5">
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-[0.69rem] text-muted-foreground sm:text-xs">{COMPARISON.industry}</span>
                    <span className="mono shrink-0 text-[0.72rem] font-medium text-ink sm:text-sm">{row.industry.text}</span>
                  </div>
                  <div className="relative h-6 bg-ink/[0.035] sm:h-7" aria-hidden>
                    <div data-impact-bar className="h-full origin-left bg-ink" style={{ width: `${row.industry.pct}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-[0.69rem] font-semibold text-ink sm:text-xs">{COMPARISON.xerxes}{alt ? " · conventional cooling" : ""}</span>
                    <span className="mono flex shrink-0 items-center gap-2 text-[0.72rem] font-medium text-ink sm:text-sm">
                      {negative && <svg width="13" height="16" viewBox="0 0 13 16" fill="none" className="text-magma-lo" aria-hidden><path d="M6.5 1v12M2 9l4.5 4.5L11 9" stroke="currentColor" strokeWidth="1.5" /></svg>}
                      {row.xerxes.text}
                    </span>
                  </div>
                  <div className="relative h-6 bg-ink/[0.035] sm:h-7" aria-hidden>
                    {zero ? (
                      <>
                        <div data-impact-bar className="absolute inset-y-0 left-0 w-[3px] origin-left bg-magma" />
                        <svg viewBox="0 0 100 28" className="absolute left-3 top-0 h-full w-24" fill="none"><path d="M2 14h28m9 0c0-8 11-8 11 0s-11 8-11 0ZM61 14h25" stroke="#b8330a" strokeOpacity="0.32" strokeWidth="0.8" /><circle cx="39" cy="14" r="12" stroke="#b8330a" strokeOpacity="0.1" /></svg>
                      </>
                    ) : (
                      <div data-impact-bar className="relative h-full origin-left overflow-hidden bg-gradient-to-r from-magma to-magma-hi" style={{ width: `${row.xerxes.pct}%` }}>
                        {negative && <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(-45deg, transparent 0px, transparent 4px, rgba(11,13,17,.4) 4px, rgba(11,13,17,.4) 5px)" }} />}
                      </div>
                    )}
                  </div>
                </div>
                {alt && (
                  <div>
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <span className="text-[0.69rem] font-semibold text-ink sm:text-xs">{alt.label}</span>
                      <span className="mono shrink-0 text-[0.72rem] font-medium text-ink sm:text-sm">{alt.text}</span>
                    </div>
                    <div className="relative h-6 bg-ink/[0.035] sm:h-7" aria-hidden>
                      <div data-impact-bar className="relative h-full origin-left overflow-hidden bg-gradient-to-r from-[#1f5fd1] to-[#3d8bff]" style={{ width: `${alt.pct}%` }} />
                    </div>
                  </div>
                )}
                {note && (
                  <p className="flex max-w-[70ch] items-start gap-3 text-[0.8rem] leading-relaxed text-muted-foreground">
                    <span className="mt-[0.6em] h-px w-6 shrink-0 bg-magma" aria-hidden />
                    {note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Impact() {
  return (
    <section id="impact" aria-labelledby="impact-title" className="surface-ceramic relative isolate overflow-hidden py-24 sm:py-32 lg:py-40">
      <svg viewBox="0 0 700 700" className="pointer-events-none absolute -right-64 -top-24 -z-10 w-[700px] max-w-none opacity-[0.055] sm:-right-40 lg:-right-20" fill="none" aria-hidden>
        {[160, 194, 232, 276, 328].map(radius => <circle key={radius} cx="350" cy="350" r={radius} stroke="currentColor" strokeWidth="0.9" />)}
        <path d="M350 0v700M0 350h700" stroke="currentColor" strokeWidth="0.5" />
      </svg>
      <div className="wrap">
        <div data-reveal><Eyebrow>{IMPACT.eyebrow}</Eyebrow></div>
        <div className="mt-8 grid items-end gap-8 lg:grid-cols-12 lg:gap-12">
          <h2 id="impact-title" data-reveal className="display text-[clamp(2.6rem,6.4vw,6.2rem)] lg:col-span-8">
            {IMPACT.title}<br /><span className="accent-serif text-magma">{IMPACT.titleAccent}</span>
          </h2>
          <p data-reveal className="max-w-[56ch] text-[1.05rem] leading-relaxed text-muted-foreground lg:col-span-4 lg:pb-1">{IMPACT.intro}</p>
        </div>
        <div className="mt-14 lg:mt-20"><ComparisonChart /></div>
        <div className="mt-16 grid gap-10 border-t border-border pt-9 sm:grid-cols-2 lg:mt-24 lg:gap-16 lg:pt-12">
          {IMPACT.equivalences.map(equivalence => (
            <div key={equivalence.unit} className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <CountUp value={Number(equivalence.value.replace(/,/g, ""))} className="font-display text-[clamp(3.7rem,9.5vw,9rem)] font-semibold leading-none tracking-[-0.065em]" />
                <span className="accent-serif whitespace-nowrap text-[clamp(1.7rem,3.2vw,3rem)] leading-none text-magma-lo">{equivalence.unit}</span>
              </div>
              <p data-reveal className="mt-5 max-w-[37ch] text-[0.95rem] leading-relaxed text-muted-foreground">{equivalence.label}</p>
            </div>
          ))}
        </div>
        <p data-reveal className="mono mt-12 max-w-[110ch] text-[0.6rem] leading-relaxed text-muted-foreground lg:mt-16">{IMPACT.footnote}</p>
      </div>
    </section>
  );
}
