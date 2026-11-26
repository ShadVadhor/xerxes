import { LockKeyhole } from "lucide-react";
import { ACCESS } from "@/lib/content";
import { requestContact } from "@/lib/interest";
import { prefersReducedMotion } from "@/lib/smooth";
import { Arrow, Eyebrow } from "./ui";

const waveform = [14, 23, 42, 28, 54, 72, 37, 60, 89, 53, 76, 99, 63, 86, 44, 67, 91, 52, 33, 73, 58, 35, 47, 24, 15];

function PrivatePreview({ kind }: { kind: string }) {
  return (
    <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden border-b border-border bg-obsidian">
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(236,232,224,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(236,232,224,0.06)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,90,31,0.1),transparent_70%)]" />
      {kind === "whitepaper" ? (
        <div className="absolute inset-0 flex items-center justify-center opacity-35 blur-[1.1px]">
          <svg viewBox="0 0 160 210" className="mt-10 h-[90%] -rotate-9" fill="none" aria-hidden="true">
            <path d="M0 0h132l28 28v182H0Z" fill="var(--color-ceramic)" fillOpacity="0.13" stroke="var(--color-ceramic)" strokeOpacity="0.5" />
            <path d="M132 0v28h28" stroke="var(--color-ceramic)" strokeOpacity="0.45" />
            <path d="m80 29 14 8v16l-14 8-14-8V37Z" stroke="var(--color-magma-hi)" strokeWidth="1.5" />
            <path d="M23 82h112M23 91h94M23 112h112M23 120h102M23 128h112M23 136h78M23 158h112M23 166h99M23 174h112M23 182h82" stroke="var(--color-ceramic)" strokeWidth="3" strokeOpacity="0.4" />
          </svg>
        </div>
      ) : kind === "podcast" ? (
        <div className="absolute inset-x-8 flex h-28 items-center justify-center gap-[5px] opacity-35 blur-[0.8px]" aria-hidden="true">
          {waveform.map((height, index) => <span key={index} className="w-[5px] max-w-[7px] flex-1 rounded-full bg-magma-hi" style={{ height: `${height}%` }} />)}
        </div>
      ) : (
        <div className="absolute inset-x-7 flex aspect-video items-center justify-center overflow-hidden border border-ceramic/20 opacity-40 blur-[1px]" aria-hidden="true">
          <div className="strata-lines absolute inset-0 opacity-60" />
          <div className="absolute inset-0 bg-[linear-gradient(155deg,transparent_35%,rgba(255,90,31,0.2)_36%,transparent_60%)]" />
          <svg viewBox="0 0 60 60" className="h-16 w-16 text-ceramic/70" fill="none"><circle cx="30" cy="30" r="28" stroke="currentColor" strokeWidth="0.7" /><path d="m25 20 15 10-15 10Z" fill="currentColor" /></svg>
          <span className="absolute bottom-3 inset-x-3 h-px bg-ceramic/25"><i className="block h-px w-1/3 bg-magma" /></span>
        </div>
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(7,8,11,0.8),transparent_65%)]" />
      <span className="mono absolute left-5 top-5 border border-magma/35 px-2.5 py-1.5 text-[0.55rem] tracking-[0.2em] text-magma-hi">{ACCESS.items[2].meta.split(" · ")[0].toUpperCase()}</span>
      <span className="access-lock relative flex h-14 w-14 items-center justify-center rounded-full border border-ceramic/25 bg-obsidian/85 text-ceramic shadow-[0_0_35px_rgba(0,0,0,0.6)] backdrop-blur-md transition-colors duration-500 group-hover:border-magma/70 group-hover:text-magma-hi">
        <LockKeyhole size={19} strokeWidth={1.25} aria-hidden="true" />
      </span>
      <div className="brackets opacity-30"><i /></div>
    </div>
  );
}

export default function Access() {
  const reduced = prefersReducedMotion();
  return (
    <section id="access" data-motion={!reduced} aria-labelledby="access-heading" className="relative overflow-hidden bg-basalt py-24 sm:py-32 lg:py-36">
      <style>{`
        @keyframes xerxes-access-lock { 0%,100% { box-shadow:0 0 0 0 rgba(255,90,31,0); } 50% { box-shadow:0 0 0 9px rgba(255,90,31,.08),0 0 30px rgba(255,90,31,.16); } }
        @media (prefers-reduced-motion:no-preference) { #access[data-motion="true"] .group:hover .access-lock { animation:xerxes-access-lock 1.8s ease-in-out infinite; } }
      `}</style>
      <div className="wrap">
        <div data-reveal><Eyebrow>{ACCESS.eyebrow}</Eyebrow></div>
        <h2 id="access-heading" className="display mt-8 max-w-[15ch] text-[clamp(2.6rem,6.4vw,6.2rem)]" data-reveal>{ACCESS.title}</h2>
        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-3">
          {ACCESS.items.map((item, index) => (
            <div key={item.id} data-reveal data-reveal-delay={String(index * 0.1)}>
              <article className={`group flex h-full flex-col border border-border bg-basalt-2/35 transition-[transform,border-color] duration-500 hover:border-magma/60 ${reduced ? "" : "hover:-translate-y-2"}`}>
                <PrivatePreview kind={item.id} />
                <div className="flex flex-1 flex-col p-6 sm:p-8 lg:p-7 xl:p-8">
                  <p className="mono text-[0.65rem] uppercase tracking-[0.2em] text-magma-hi">{item.kind}</p>
                  <h3 className="mt-5 font-display text-[clamp(1.45rem,2.2vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.035em]">{item.title}</h3>
                  <p className="mono mt-5 min-h-[3em] text-[0.62rem] leading-relaxed text-muted-foreground">{item.meta}</p>
                  <div className="mt-auto pt-8">
                    <button type="button" className="btn-ghost w-full justify-between gap-3 !px-4 !text-[0.6rem] !tracking-[0.08em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-magma-hi" onClick={() => requestContact(item.interest, item.id)}>
                      {item.cta}<Arrow className="shrink-0" />
                    </button>
                  </div>
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
