import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { A } from "@/lib/assets";
import { TWIN, type TwinCap, type TwinModel } from "@/lib/content";
import { prefersReducedMotion } from "@/lib/smooth";
import TwinChart from "./TwinChart";
import { Eyebrow } from "./ui";

const TwinScene = lazy(() => import("./TwinScene"));

const CYCLE_MS = 9000;
const LEGEND: Record<TwinCap, { c: string; t: string }[]> = {
  demand: [{ c: "#ff6a2a", t: "Live load" }, { c: "#7cc4ff", t: "Forecast sleeve" }],
  storage: [{ c: "#ffb347", t: "Stored energy" }, { c: "#e9b949", t: "Charge path" }],
  stability: [{ c: "#ff6a2a", t: "Active" }, { c: "#ffd3b0", t: "Standby taking load" }],
  cooling: [{ c: "#7cc4ff", t: "Nano-CO₂ loop" }, { c: "#ff7a3a", t: "Heat" }],
  maintenance: [{ c: "#49e39a", t: "Healthy" }, { c: "#ffb020", t: "Flagged ahead" }],
};

function ModelGlyph({ model }: { model: TwinModel }) {
  if (model === "dtf") {
    return (
      <svg viewBox="0 0 44 44" className="h-10 w-10 shrink-0" fill="none" aria-hidden>
        <rect x="15" y="17" width="14" height="10" stroke="currentColor" strokeWidth="1" />
        <path d="M22 27v12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="22" cy="40" r="1.6" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 44 44" className="h-10 w-10 shrink-0" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="5" stroke="currentColor" strokeWidth="1" />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        return <ellipse key={i} cx={22 + Math.cos(a) * 14} cy={22 + Math.sin(a) * 14} rx="4.2" ry="2.6" transform={`rotate(${(a * 180) / Math.PI} ${22 + Math.cos(a) * 14} ${22 + Math.sin(a) * 14})`} stroke="currentColor" strokeWidth="1" />;
      })}
    </svg>
  );
}

export default function DigitalTwin() {
  const root = useRef<HTMLElement>(null);
  const [model, setModel] = useState<TwinModel>("xerxes");
  const [cap, setCap] = useState<TwinCap>("demand");
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [mountScene, setMountScene] = useState(false);
  const scene = TWIN.scenes[model][cap];
  const capIndex = TWIN.caps.findIndex(c => c.id === cap);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (entry.isIntersecting) setMountScene(true);
    }, { threshold: 0.2, rootMargin: "200px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Tour the five capabilities, then switch model, until the visitor takes over.
  useEffect(() => {
    if (!auto || !inView || prefersReducedMotion()) return;
    const timer = window.setTimeout(() => {
      if (capIndex === TWIN.caps.length - 1) {
        setModel(m => (m === "xerxes" ? "dtf" : "xerxes"));
        setCap(TWIN.caps[0].id);
      } else setCap(TWIN.caps[capIndex + 1].id);
    }, CYCLE_MS);
    return () => window.clearTimeout(timer);
  }, [auto, inView, capIndex, model]);

  const pick = (next: TwinCap) => { setAuto(false); setCap(next); };
  const pickModel = (next: TwinModel) => { setAuto(false); setModel(next); };

  return (
    <section ref={root} id="twin" aria-labelledby="twin-title" className="relative isolate overflow-hidden bg-obsidian py-24 sm:py-32 lg:py-40">
      <div className="strata-lines pointer-events-none absolute inset-0 -z-10 opacity-[0.14] [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)]" aria-hidden />
      <div className="pointer-events-none absolute left-1/2 top-[38%] -z-10 h-[820px] w-[1200px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(61,139,255,0.13),transparent)]" aria-hidden />
      <div className="wrap">
        <div className="grid items-end gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <div data-reveal><Eyebrow>{TWIN.eyebrow}</Eyebrow></div>
            <h2 id="twin-title" data-reveal className="display mt-8 text-[clamp(2.6rem,6.4vw,6.2rem)] lg:text-[clamp(2.6rem,5.2vw,6.2rem)]">
              {TWIN.title} <span className="accent-serif text-magma-grad">{TWIN.accent}</span>
            </h2>
          </div>
          <div className="lg:col-span-5 lg:pb-2">
            <p data-reveal className="max-w-[54ch] text-[1.02rem] leading-relaxed text-white/65">{TWIN.intro}</p>
            <p data-reveal className="mono mt-5 inline-flex items-center gap-2 border border-led-hi/30 bg-led/10 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.2em] text-led-hi">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-led-hi" />{TWIN.badge}
            </p>
          </div>
        </div>

        {/* model toggle: the small model and the Goliath */}
        <div role="radiogroup" aria-label="Choose the twin" className="mt-12 grid gap-3 sm:grid-cols-2 lg:mt-16">
          {(["dtf", "xerxes"] as TwinModel[]).map(id => {
            const m = TWIN.models[id];
            const active = model === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pickModel(id)}
                className={`group relative flex items-center gap-4 border px-5 py-4 text-left transition-colors duration-500 ${active ? "border-magma/70 bg-magma/[0.07] text-white" : "border-white/12 bg-white/[0.02] text-white/55 hover:border-white/30 hover:text-white/85"}`}
              >
                <span className={active ? "text-magma-hi" : "text-white/40"}><ModelGlyph model={id} /></span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-baseline gap-x-3">
                    <span className={`font-display font-semibold tracking-[-0.03em] ${id === "xerxes" ? "text-[1.6rem]" : "text-[1.15rem]"}`}>{m.name}</span>
                    <span className="mono text-[0.58rem] uppercase tracking-[0.2em] text-magma-hi/90">{m.kind}</span>
                  </span>
                  <span className="mono mt-1 block truncate text-[0.62rem] tracking-[0.06em] text-white/45">{m.line}</span>
                </span>
                {active && <span className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-magma to-magma-hi" aria-hidden />}
              </button>
            );
          })}
        </div>

        {/* capability tabs */}
        <div role="tablist" aria-label="What the twin predicts" className="-mx-[clamp(1.25rem,6vw,7.5rem)] mt-4 flex gap-px overflow-x-auto px-[clamp(1.25rem,6vw,7.5rem)] [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {TWIN.caps.map(c => {
            const active = c.id === cap;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                id={`twin-tab-${c.id}`}
                aria-selected={active}
                aria-controls="twin-panel"
                onClick={() => pick(c.id)}
                className={`relative min-w-[180px] shrink-0 border px-4 py-3.5 text-left transition-colors duration-300 lg:min-w-0 ${active ? "border-white/25 bg-white/[0.06]" : "border-white/8 bg-white/[0.015] hover:bg-white/[0.04]"}`}
              >
                <span className={`mono text-[0.58rem] tracking-[0.22em] ${active ? "text-magma-hi" : "text-white/35"}`}>{c.n}</span>
                <span className={`mt-1 block font-display text-[1.02rem] font-semibold tracking-[-0.02em] ${active ? "text-white" : "text-white/60"}`}>{c.t}</span>
                <span className="mt-0.5 block text-[0.75rem] text-white/40">{c.short}</span>
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white/5" aria-hidden>
                  {active && (
                    <span
                      key={`${model}-${cap}-${auto}`}
                      className="block h-full origin-left bg-magma"
                      style={auto && inView ? { animation: `twin-progress ${CYCLE_MS}ms linear forwards` } : { transform: "scaleX(1)" }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div id="twin-panel" role="tabpanel" aria-labelledby={`twin-tab-${cap}`} className="mt-4 grid gap-4 lg:grid-cols-12">
          {/* the 3D twin */}
          <div className="relative aspect-square min-h-[340px] overflow-hidden border border-white/10 bg-[#05080c] sm:aspect-[16/11] lg:col-span-7 lg:aspect-auto lg:min-h-[600px]">
            {mountScene && webgl && (
              <Suspense fallback={null}>
                <TwinScene model={model} cap={cap} callouts={scene.callouts} onUnsupported={() => setWebgl(false)} />
              </Suspense>
            )}
            {!webgl && (
              <img src={model === "xerxes" ? A.walkCampus : A.dtfPad} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 saturate-[0.6]" />
            )}
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(124,196,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(124,196,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(closest-side,transparent_55%,black)]" aria-hidden />
            <div className="brackets m-3" aria-hidden><i /></div>
            <div className="pointer-events-none absolute left-5 top-5 sm:left-6 sm:top-6">
              <p className="mono flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.22em] text-led-hi">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#49e39a]" />Digital twin · {TWIN.models[model].name}
              </p>
              <p className="mono mt-1.5 text-[0.56rem] uppercase tracking-[0.2em] text-white/40">Live mirror · simulated</p>
            </div>
            <div className="pointer-events-none absolute right-5 top-5 hidden text-right sm:right-6 sm:top-6 sm:block">
              <p className="mono text-[0.56rem] uppercase tracking-[0.2em] text-white/40">AI GMS mode</p>
              <p className="mono mt-1 text-[0.66rem] uppercase tracking-[0.18em] text-white">{TWIN.caps[capIndex].n} · {TWIN.caps[capIndex].t}</p>
            </div>
            <div className="pointer-events-none absolute bottom-5 left-5 flex flex-wrap gap-x-4 gap-y-1.5 sm:bottom-6 sm:left-6">
              {LEGEND[cap].map(item => (
                <span key={item.t} className="mono flex items-center gap-2 text-[0.56rem] uppercase tracking-[0.18em] text-white/60">
                  <span className="h-2 w-2 rounded-full" style={{ background: item.c, boxShadow: `0 0 8px ${item.c}` }} />{item.t}
                </span>
              ))}
            </div>
            <p className="mono pointer-events-none absolute bottom-5 right-5 hidden text-[0.56rem] uppercase tracking-[0.2em] text-white/35 sm:bottom-6 sm:right-6 sm:block">{webgl ? "Drag to orbit" : "Static view"}</p>
          </div>

          {/* HUD: what AI GMS sees, predicts and does */}
          <div className="relative flex min-w-0 flex-col border border-white/10 bg-basalt/70 p-5 sm:p-7 lg:col-span-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${model}-${cap}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                className="flex flex-1 flex-col"
              >
                <p className="mono text-[0.6rem] uppercase tracking-[0.22em] text-magma-hi">{TWIN.models[model].name} · {TWIN.caps[capIndex].t}</p>
                <h3 className="display mt-3 text-[clamp(1.6rem,2.4vw,2.2rem)] text-white">{scene.headline}</h3>
                <p className="mt-3 text-[0.94rem] leading-relaxed text-white/60">{scene.body}</p>
                <div className="mt-6 border-t border-white/10 pt-5">
                  <TwinChart model={model} cap={cap} title={scene.chart} />
                </div>
                <dl className="mt-5 grid grid-cols-3 gap-px bg-white/10">
                  {scene.kpis.map(k => (
                    <div key={k.l} className="bg-basalt p-3 sm:p-4">
                      <dt className="sr-only">{k.l}</dt>
                      <dd className="font-display text-[clamp(1.05rem,1.6vw,1.45rem)] font-semibold leading-none tracking-[-0.03em] text-white">{k.v}</dd>
                      <dd className="mono mt-2 text-[0.54rem] uppercase leading-snug tracking-[0.12em] text-white/45">{k.l}</dd>
                    </div>
                  ))}
                </dl>
                <ol className="mt-5 space-y-2" aria-label="AI GMS loop: SCADA, LLM, LAM">
                  {scene.log.map(([who, what], i) => (
                    <motion.li
                      key={who}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.55, duration: 0.4 }}
                      className="flex items-start gap-3"
                    >
                      <span className={`mono mt-px w-[3.6rem] shrink-0 border px-1.5 py-0.5 text-center text-[0.55rem] tracking-[0.16em] ${who === "LAM" ? "border-magma/60 text-magma-hi" : who === "LLM" ? "border-led-hi/50 text-led-hi" : "border-white/25 text-white/60"}`}>{who}</span>
                      <span className="mono text-[0.68rem] leading-relaxed text-white/75">{what}</span>
                    </motion.li>
                  ))}
                </ol>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <p className="mono mt-5 max-w-[110ch] text-[0.6rem] leading-relaxed tracking-[0.04em] text-white/35">{TWIN.footnote}</p>
      </div>
    </section>
  );
}
