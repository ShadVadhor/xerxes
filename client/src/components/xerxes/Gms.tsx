import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GMS } from "@/lib/content";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { CountUp, Eyebrow } from "./ui";

// Interface-only labels explicitly specified for the dashboard; all claims come from GMS.
const DASHBOARD = { live: "LIVE · SIM", recommendations: "Live recommendations", index: "REC" };

/** No polling while the observed element is off-screen or the document is hidden. */
function useVisibleInterval<T extends HTMLElement>(ref: RefObject<T | null>, callback: () => void, delay: number) {
  const callbackRef = useRef(callback);
  useEffect(() => { callbackRef.current = callback; });
  useEffect(() => {
    const element = ref.current;
    if (!element || prefersReducedMotion()) return;
    let visible = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
      if (visible && !document.hidden && !prefersReducedMotion()) {
        interval = setInterval(() => callbackRef.current(), delay);
      }
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.35 });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    media.addEventListener("change", sync);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      media.removeEventListener("change", sync);
      if (interval !== undefined) clearInterval(interval);
    };
  }, [ref, delay]);
}

function smoothPath(points: number[]) {
  const step = 320 / (points.length - 1);
  let path = `M 0 ${points[0]}`;
  for (let i = 1; i < points.length; i++) {
    const previousX = (i - 1) * step;
    const x = i * step;
    const mid = (previousX + x) / 2;
    path += ` C ${mid} ${points[i - 1]}, ${mid} ${points[i]}, ${x} ${points[i]}`;
  }
  return path;
}

function KpiTile({ item, index }: { item: (typeof GMS.kpis)[number]; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const lineRef = useRef<SVGPathElement>(null);
  const firstTicks = useRef(0);
  const gradientId = useId().replace(/:/g, "");
  const [liveValue, setLiveValue] = useState<number | null>(null);
  const [points, setPoints] = useState(() => Array.from({ length: 32 }, (_, i) =>
    37 + Math.sin(i * 0.61 + index) * 8 + Math.cos(i * 1.33) * 3 + (index === 1 ? i * 0.3 : 0)
  ));

  useVisibleInterval(ref, () => {
    firstTicks.current += 1;
    // CountUp gets its full initial reveal before live simulated values take over.
    if (firstTicks.current > 1) {
      const jitter = (0.0015 + Math.random() * 0.0025) * (Math.random() > 0.5 ? 1 : -1);
      setLiveValue(item.value * (1 + jitter));
    }
    setPoints(previous => {
      const last = previous[previous.length - 1];
      // SVG y increases downwards: the parasitic-load trace drifts gently down.
      const drift = index === 1 ? 0.6 : (40 - last) * 0.13;
      const next = Math.max(17, Math.min(65, last + (Math.random() - 0.5) * 8 + drift));
      return [...previous.slice(1), next];
    });
  }, 1400);

  useEffect(() => {
    const line = lineRef.current;
    const element = ref.current;
    if (!line || !element || prefersReducedMotion()) return;
    const length = line.getTotalLength();
    gsap.set(line, { strokeDasharray: length, strokeDashoffset: length });
    let tween: gsap.core.Tween | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      tween = gsap.to(line, {
        strokeDashoffset: 0, duration: 1.8, ease: "power2.out",
        onComplete: () => { gsap.set(line, { clearProps: "strokeDasharray,strokeDashoffset" }); },
      });
    }, { threshold: 0.4 });
    observer.observe(element);
    return () => { observer.disconnect(); tween?.kill(); };
  }, []);

  const path = smoothPath(points);
  return (
    <div ref={ref} className="relative min-w-0 overflow-hidden border border-white/10 bg-white/[0.025] px-4 pt-5 sm:px-5">
      <div className="flex items-start justify-between gap-2">
        <p className="mono text-[0.6rem] uppercase leading-relaxed tracking-[0.14em] text-muted-foreground sm:text-[0.65rem]">{item.label}</p>
        <span className={`mt-1 h-1 w-1 shrink-0 rounded-full ${index === 3 ? "bg-led-hi" : "bg-magma-hi"}`} aria-hidden />
      </div>
      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-0">
        <span className="font-display text-[clamp(2rem,3.5vw,3.5rem)] font-semibold leading-none tracking-[-0.05em] tabular-nums">
          {liveValue === null ? <CountUp value={item.value} decimals={item.decimals} /> : liveValue.toLocaleString("en-US", { minimumFractionDigits: item.decimals, maximumFractionDigits: item.decimals })}
        </span>
        <span className={`mono text-[0.68rem] ${index === 3 ? "text-led-hi" : "text-magma-hi"}`}>{item.unit}</span>
      </div>
      <svg role="img" aria-label={`${item.label} · ${GMS.badge}`} viewBox="0 0 320 80" className="mt-4 block h-14 w-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`${gradientId}-stroke`}><stop stopColor="#ff5a1f" /><stop offset="1" stopColor="#7cc4ff" /></linearGradient>
          <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#3d8bff" stopOpacity="0.17" /><stop offset="1" stopColor="#3d8bff" stopOpacity="0" /></linearGradient>
        </defs>
        <path d="M0 70H320 M0 35H320" stroke="white" strokeOpacity="0.07" strokeWidth="0.7" />
        <path d={`${path} L320 80 L0 80 Z`} fill={`url(#${gradientId}-area)`} style={{ transition: "d 1.2s ease" }} />
        <path ref={lineRef} d={path} fill="none" stroke={`url(#${gradientId}-stroke)`} strokeWidth="1.6" vectorEffect="non-scaling-stroke" style={{ transition: "d 1.2s ease" }} />
        <circle cx="320" cy={points[points.length - 1]} r="2.5" fill="#7cc4ff" />
      </svg>
    </div>
  );
}

function ControlLoop() {
  const id = useId().replace(/:/g, "");
  const positions = [
    { x: 24, y: 24 }, { x: 304, y: 24 },
    { x: 304, y: 208 }, { x: 24, y: 208 },
  ];
  const connectors = [
    { d: "M216 67 H304", blue: true },
    { d: "M400 110 V208", blue: false },
    { d: "M304 251 H216", blue: false },
    { d: "M120 208 V110", blue: true },
  ];
  return (
    <svg role="img" aria-label={GMS.loop.map(node => `${node.label}: ${node.sub}`).join(" → ")} viewBox="0 0 520 316" className="mx-auto block w-full max-w-[620px]">
      <defs>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4" /></filter>
        {["blue", "orange"].map(color => (
          <marker key={color} id={`${id}-${color}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="m1 1 5 3-5 3" fill="none" stroke={color === "blue" ? "#7cc4ff" : "#ff8f4a"} strokeWidth="1.2" /></marker>
        ))}
      </defs>
      <circle cx="260" cy="159" r="94" fill="none" stroke="white" strokeOpacity="0.04" />
      <circle cx="260" cy="159" r="72" fill="none" stroke="white" strokeOpacity="0.04" strokeDasharray="2 8" />
      <path d="M244 159H276 M260 143V175" stroke="#7cc4ff" strokeOpacity="0.25" strokeWidth="0.8" />
      {connectors.map((connector, index) => (
        <g key={connector.d}>
          <path d={connector.d} fill="none" stroke={connector.blue ? "#3d8bff" : "#ff5a1f"} strokeOpacity="0.18" strokeWidth="3" />
          <path d={connector.d} fill="none" stroke={connector.blue ? "#7cc4ff" : "#ff8f4a"} strokeWidth="1.3" strokeDasharray="4 6" markerEnd={`url(#${id}-${connector.blue ? "blue" : "orange"})`} style={{ animation: "flow-dash 2.8s linear infinite", animationDelay: `${index * -0.6}s` }} />
        </g>
      ))}
      {GMS.loop.map((node, index) => {
        const { x, y } = positions[index];
        const stroke = index < 2 ? "#3d8bff" : "#ff5a1f";
        return (
          <g key={node.id}>
            <rect x={x} y={y} width="192" height="86" rx="8" fill="none" stroke={stroke} strokeOpacity="0.45" strokeWidth="2" filter={`url(#${id}-glow)`} />
            <rect x={x} y={y} width="192" height="86" rx="8" fill="#10151d" stroke={stroke} strokeOpacity="0.5" strokeWidth="0.8" />
            <circle cx={x + 16} cy={y + 19} r="2" fill={stroke} />
            <text x={x + 96} y={y + 37} textAnchor="middle" fill="#ece8e0" fontFamily="var(--font-display)" fontSize="17" fontWeight="600">{node.label}</text>
            <text x={x + 96} y={y + 61} textAnchor="middle" fill="#a6adb8" fontFamily="var(--font-mono)" fontSize="8.7">{node.sub}</text>
          </g>
        );
      })}
    </svg>
  );
}

function OpexCard() {
  const ref = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    const bar = barRef.current;
    if (!element || !bar) return;
    if (prefersReducedMotion()) { gsap.set(bar, { scaleX: 1 }); return; }
    gsap.set(bar, { scaleX: 0 });
    let tween: gsap.core.Tween | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      tween = gsap.to(bar, { scaleX: 1, duration: 1.6, ease: "power3.out" });
    }, { threshold: 0.4 });
    observer.observe(element);
    return () => { observer.disconnect(); tween?.kill(); };
  }, []);
  return (
    <div ref={ref} className="min-w-0 border border-white/10 bg-black/15 p-6 lg:p-7">
      <p className="font-display text-[clamp(3.4rem,5vw,5.4rem)] font-semibold leading-none tracking-[-0.06em] text-magma-hi"><CountUp value={GMS.opex.value} decimals={1} suffix="%" /></p>
      <h3 className="mt-4 text-base font-medium">{GMS.opex.label}</h3>
      <p className="mt-2 max-w-[35ch] text-sm leading-relaxed text-muted-foreground">{GMS.opex.sub}</p>
      <div className="mt-6 h-[3px] overflow-hidden bg-white/10" aria-hidden>
        <div ref={barRef} className="h-full origin-left bg-gradient-to-r from-magma to-magma-hi" style={{ width: `${GMS.opex.value}%` }} />
      </div>
    </div>
  );
}

function Recommendations() {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const reduced = prefersReducedMotion();
  useVisibleInterval(ref, () => setIndex(previous => (previous + 1) % GMS.recommendations.length), 3200);
  return (
    <div ref={ref} className="relative min-w-0 overflow-hidden border border-led/20 bg-led/[0.025] p-6 lg:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="mono text-[0.64rem] uppercase tracking-[0.14em] text-led-hi">{DASHBOARD.recommendations}</h3>
        <span className="mono text-[0.6rem] text-muted-foreground">{DASHBOARD.index} {String(index + 1).padStart(2, "0")}/{String(GMS.recommendations.length).padStart(2, "0")}</span>
      </div>
      <div className="relative mt-7 min-h-28" aria-live="off">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={index} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -10 }} transition={{ duration: reduced ? 0 : 0.38 }} className="max-w-[32ch] text-lg leading-relaxed">
            {GMS.recommendations[index]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-5 flex gap-1.5" aria-hidden>
        {GMS.recommendations.map((text, i) => <span key={text} className={`h-[2px] flex-1 transition-colors ${index === i ? "bg-led-hi" : "bg-white/10"}`} />)}
      </div>
      <ol className="sr-only">{GMS.recommendations.map(text => <li key={text}>{text}</li>)}</ol>
    </div>
  );
}

export default function Gms() {
  const words = GMS.title.split(" ");
  const accent = words.splice(-2).join(" ");
  return (
    <section id="intelligence" aria-labelledby="gms-title" className="relative isolate overflow-hidden bg-basalt py-24 sm:py-32 lg:py-40">
      <div className="strata-lines pointer-events-none absolute inset-0 -z-10 opacity-35" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10" style={{ background: "radial-gradient(ellipse at 80% 30%, rgba(61,139,255,.075), transparent 55%)" }} aria-hidden />
      <div className="wrap">
        <div className="grid items-start gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-16">
          <div className="min-w-0 lg:sticky lg:top-32 lg:col-span-5">
            <div data-reveal><Eyebrow>{GMS.eyebrow}</Eyebrow></div>
            <h2 id="gms-title" data-reveal className="display mt-8 text-[clamp(2.6rem,6.4vw,6.2rem)] lg:text-[clamp(2.6rem,5.2vw,6.2rem)]">{words.join(" ")} <span className="accent-serif text-magma-grad">{accent}</span></h2>
            <p data-reveal className="mt-7 max-w-[56ch] text-[1.05rem] leading-relaxed text-muted-foreground">{GMS.intro}</p>
            <ul data-reveal className="mt-8 flex flex-wrap gap-2">
              {GMS.capabilities.map(capability => <li key={capability} className="mono rounded-full border border-white/10 px-3 py-2 text-[0.59rem] leading-relaxed tracking-[0.035em] text-ceramic/75">{capability}</li>)}
            </ul>
            <p data-reveal className="mono mt-9 flex items-center gap-3 text-[0.63rem] tracking-[0.08em] text-muted-foreground"><span className="pulse-dot inline-block shrink-0" aria-hidden />{GMS.badge}</p>
          </div>
          <div className="relative min-w-0 overflow-hidden border border-white/10 bg-black/30 p-4 backdrop-blur-sm sm:p-6 lg:col-span-7">
            <div className="brackets" aria-hidden><i /></div>
            <div className="scanline opacity-20" aria-hidden />
            <div className="relative mb-5 flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <span className="mono text-[0.64rem] uppercase tracking-[0.22em] text-ceramic/65">{GMS.eyebrow.split(" — ")[1]}</span>
              <span className="mono flex shrink-0 items-center gap-2.5 text-[0.58rem] tracking-[0.12em] text-led-hi"><span className="pulse-dot inline-block scale-75" aria-hidden />{DASHBOARD.live}</span>
            </div>
            <div className="relative grid grid-cols-2 gap-3">{GMS.kpis.map((item, index) => <KpiTile key={item.label} item={item} index={index} />)}</div>
            <div className="relative my-5 border-y border-white/10 py-4"><ControlLoop /></div>
            <ol className="relative grid grid-cols-2 gap-x-5 gap-y-6 xl:grid-cols-4">
              {GMS.steps.map(step => (
                <li key={step.n} className="min-w-0">
                  <span className="mono text-[0.65rem] text-led-hi">{step.n}</span>
                  <h3 className="mt-2 text-[0.78rem] font-medium leading-snug">{step.t}</h3>
                  <p className="mt-2 text-[0.68rem] leading-relaxed text-muted-foreground">{step.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-3 lg:mt-20">
          <div className="min-w-0 border border-white/10 bg-black/15 p-6 lg:p-7">
            <h3 className="mono text-[0.65rem] uppercase tracking-[0.12em] text-ceramic/75">{GMS.hybrid.title}</h3>
            <dl className="mt-7 space-y-4">
              {GMS.hybrid.items.map(item => {
                const number = Number.parseFloat(item.value);
                const suffix = item.value.replace(/^[\d.]+/, "");
                const decimals = (item.value.match(/\.(\d+)/)?.[1] ?? "").length;
                return <div key={item.label} className="flex items-baseline justify-between gap-2 border-b border-white/[0.07] pb-3"><dt className="text-xs text-muted-foreground">{item.label}</dt><dd className="font-display whitespace-nowrap text-[1.55rem] font-semibold tracking-[-0.04em]"><CountUp value={number} decimals={decimals} suffix={suffix} /></dd></div>;
              })}
            </dl>
          </div>
          <OpexCard />
          <Recommendations />
        </div>
        <p data-reveal className="mono mt-7 max-w-[95ch] text-[0.6rem] leading-relaxed text-muted-foreground">{GMS.footnote}</p>
      </div>
    </section>
  );
}
