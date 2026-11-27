import { useId, useMemo } from "react";
import { motion } from "framer-motion";
import type { TwinCap, TwinModel } from "@/lib/content";

/**
 * Small SVG charts for the digital twin HUD. Every series is a deterministic illustrative simulation of the
 * behaviour AI GMS is designed for (forecast, storage schedule, fault ride-through, pre-cooling, health trend).
 */

const W = 560;
const H = 216;
const L = 38;
const R = 12;
const T = 16;
const B = 28;

type Series = { d: string; kind: "actual" | "forecast" | "ghost" | "band" | "limit" | "bars-up" | "bars-down" | "plan" };
type ChartSpec = {
  series: Series[];
  yTicks: { v: string; y: number }[];
  xTicks: { v: string; x: number }[];
  now?: number;
  window?: [number, number];
  marks: { x: number; y: number; text: string; tone: "magma" | "led" | "gold"; anchor?: "start" | "middle" | "end" }[];
};

function scale(x0: number, x1: number, y0: number, y1: number) {
  const sx = (x: number) => L + ((x - x0) / (x1 - x0)) * (W - L - R);
  const sy = (y: number) => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
  return { sx, sy };
}

function path(points: [number, number][]) {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
}

function sample(from: number, to: number, n: number, f: (x: number) => number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = from + ((to - from) * i) / n;
    out.push([x, f(x)]);
  }
  return out;
}

const gauss = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
const noise = (x: number, seed: number) => Math.sin(x * 12.9898 + seed) * 0.5 + Math.sin(x * 4.1 + seed * 3) * 0.5;

function build(model: TwinModel, cap: TwinCap): ChartSpec {
  const big = model === "xerxes";
  if (cap === "demand") {
    const y1 = big ? 100 : 20;
    const { sx, sy } = scale(-12, 12, 0, y1);
    const base = (t: number) => (big ? 62 + 7 * Math.sin(((t + 4) / 24) * Math.PI * 2) + 22 * gauss(t, 5, 2.4) : 13.6 + 1.2 * Math.sin(((t + 4) / 24) * Math.PI * 2) + 3.1 * gauss(t, 7, 1.6));
    const actual = sample(-12, 0, 48, t => base(t) + noise(t, 1) * (big ? 2.4 : 0.45));
    const forecast = sample(-3, 12, 60, base);
    const spread = (t: number) => (big ? 2 : 0.35) + Math.max(0, t) * (big ? 0.55 : 0.1);
    const upper = forecast.map(([t, v]) => [sx(t), sy(v + spread(t))] as [number, number]);
    const lower = forecast.map(([t, v]) => [sx(t), sy(v - spread(t))] as [number, number]).reverse();
    const peakT = big ? 5 : 7;
    return {
      series: [
        { d: `${path(upper)}${path(lower).replace("M", "L")}Z`, kind: "band" },
        { d: path(forecast.map(([t, v]) => [sx(t), sy(v)])), kind: "forecast" },
        { d: path(actual.map(([t, v]) => [sx(t), sy(v)])), kind: "actual" },
      ],
      yTicks: (big ? [0, 50, 100] : [0, 10, 20]).map(v => ({ v: big ? `${v}%` : `${v}`, y: sy(v) })),
      xTicks: [-12, -6, 0, 6, 12].map(v => ({ v: v === 0 ? "NOW" : `${v > 0 ? "+" : ""}${v} h`, x: sx(v) })),
      now: sx(0),
      marks: [{ x: sx(peakT), y: sy(base(peakT) + spread(peakT)) - 8, text: big ? "+22% · 18:00" : "+3 MW · 20:00", tone: "magma" }],
    };
  }
  if (cap === "storage") {
    const { sx, sy } = scale(-12, 12, 0, 100);
    const soc = (t: number) => {
      if (big) {
        if (t < 4) return 50 + 35 * smooth01((t + 8) / 12) + 2 * Math.sin(t);
        if (t < 9) return 85 - 30 * smooth01((t - 4) / 5);
        return 55 + 10 * smooth01((t - 9) / 3);
      }
      if (t < 3) return 40 + 50 * smooth01((t + 6) / 9);
      if (t < 9) return 90 - 55 * smooth01((t - 6) / 3) * (t > 6 ? 1 : 0);
      return 35 + 25 * smooth01((t - 9) / 3);
    };
    const flowAt = (t: number) => (soc(t + 0.25) - soc(t - 0.25)) * 2;
    const bars: string[] = [];
    const barsDown: string[] = [];
    const zero = sy(12);
    for (let t = -11.5; t <= 11.5; t += 1) {
      const f = flowAt(t);
      const h = Math.min(26, Math.abs(f) * 2.2);
      const x = sx(t) - 5;
      if (f >= 0) bars.push(`M${x.toFixed(1)} ${zero}h10v${(-h).toFixed(1)}h-10Z`);
      else barsDown.push(`M${x.toFixed(1)} ${zero}h10v${h.toFixed(1)}h-10Z`);
    }
    const peak: [number, number] = big ? [4, 9] : [6, 9];
    return {
      series: [
        { d: bars.join(""), kind: "bars-up" },
        { d: barsDown.join(""), kind: "bars-down" },
        { d: path(sample(0, 12, 60, soc).map(([t, v]) => [sx(t), sy(v)])), kind: "plan" },
        { d: path(sample(-12, 0, 60, t => soc(t) + noise(t, 3) * 0.8).map(([t, v]) => [sx(t), sy(v)])), kind: "actual" },
      ],
      yTicks: [0, 50, 100].map(v => ({ v: `${v}%`, y: sy(v) })),
      xTicks: [-12, -6, 0, 6, 12].map(v => ({ v: v === 0 ? "NOW" : `${v > 0 ? "+" : ""}${v} h`, x: sx(v) })),
      now: sx(0),
      window: [sx(peak[0]), sx(peak[1])],
      marks: [
        { x: sx(peak[0]) - 6, y: sy(big ? 85 : 90) + 20, text: big ? "Charged 85%" : "Charged 90%", tone: "gold", anchor: "end" },
        { x: (sx(peak[0]) + sx(peak[1])) / 2, y: T + 10, text: "Forecast peak", tone: "magma" },
      ],
    };
  }
  if (cap === "stability") {
    const { sx, sy } = scale(-2, 8, -8, 4);
    const dip = big ? 3.1 : 2.2;
    const managed = (t: number) => (t < 0 ? noise(t, 5) * 0.12 : -dip * Math.exp(-t / 0.35) * Math.min(1, t / 0.04) + noise(t, 5) * 0.08);
    const reactive = (t: number) => (t < 0 ? 0 : -(dip * 2.2) * Math.exp(-t / 2.2) * Math.cos(t * 2.1) * Math.min(1, t / 0.08));
    const band = `M${sx(-2)} ${sy(1)}H${sx(8)}V${sy(-1)}H${sx(-2)}Z`;
    return {
      series: [
        { d: band, kind: "band" },
        { d: path(sample(-2, 8, 200, reactive).map(([t, v]) => [sx(t), sy(v)])), kind: "ghost" },
        { d: path(sample(-2, 8, 240, managed).map(([t, v]) => [sx(t), sy(v)])), kind: "actual" },
      ],
      yTicks: [4, 0, -4, -8].map(v => ({ v: `${v > 0 ? "+" : ""}${v}%`, y: sy(v) })),
      xTicks: [-2, 0, 2, 4, 6, 8].map(v => ({ v: v === 0 ? (big ? "RING A DIP" : "LOAD STEP") : `${v} s`, x: sx(v) })),
      now: sx(0),
      marks: [
        { x: sx(0.9), y: sy(-dip) + 4, text: big ? "AI GMS · standby ring in 12 ms" : "AI GMS · BESS bridges the step", tone: "led" },
        { x: sx(3.2), y: sy(-dip * 1.9), text: "Without AI GMS", tone: "magma" },
      ],
    };
  }
  if (cap === "cooling") {
    const limit = big ? 27 : 34;
    const base = big ? 24 : 31;
    const { sx, sy } = scale(-60, 120, base - 4, limit + 4);
    const rise = (t: number) => smooth01((t - 40) / 25);
    const managed = (t: number) => base - 1.5 * smooth01(t / 30) * (1 - rise(t) * 0.2) + rise(t) * 2.2 + noise(t / 10, 7) * 0.12;
    const reactive = (t: number) => base + rise(t) * 4.8 * Math.exp(-Math.max(0, t - 70) / 45) + noise(t / 10, 7) * 0.12;
    const load = (t: number) => base - 3.6 + rise(t) * 2.2;
    const loadPts = sample(-60, 120, 90, load).map(([t, v]) => [sx(t), sy(v)] as [number, number]);
    return {
      series: [
        { d: `${path(loadPts)}L${sx(120)} ${sy(base - 4)}L${sx(-60)} ${sy(base - 4)}Z`, kind: "band" },
        { d: `M${sx(-60)} ${sy(limit)}H${sx(120)}`, kind: "limit" },
        { d: path(sample(-60, 120, 180, reactive).map(([t, v]) => [sx(t), sy(v)])), kind: "ghost" },
        { d: path(sample(-60, 120, 180, managed).map(([t, v]) => [sx(t), sy(v)])), kind: "actual" },
      ],
      yTicks: [base - 4, base, limit, limit + 4].map(v => ({ v: `${v}°`, y: sy(v) })),
      xTicks: [-60, 0, 40, 120].map(v => ({ v: v === 0 ? "NOW" : v === 40 ? "LOAD RISE" : `${v > 0 ? "+" : ""}${v} min`, x: sx(v) })),
      now: sx(0),
      marks: [
        { x: sx(16), y: sy(base - 1.5) + 16, text: "Pre-cool", tone: "led" },
        { x: sx(80), y: sy(limit + 1.9), text: "Reactive cooling", tone: "magma" },
      ],
    };
  }
  // maintenance
  const cross = big ? 21 : 14;
  const service: [number, number] = big ? [6, 8] : [3, 4];
  const { sx, sy } = scale(-30, 30, 0, 100);
  const decay = (t: number) => 100 - 30 * ((t + 30) / 30) ** 2 * (big ? 1 : 1.05) * (1 + 0) - Math.max(0, t) * (big ? 0.55 : 1.6);
  const forecast = sample(0, cross + 2, 40, decay);
  const planned = sample(service[1], 30, 30, t => 98 - (t - service[1]) * 0.08);
  return {
    series: [
      { d: `M${sx(-30)} ${sy(40)}H${sx(30)}`, kind: "limit" },
      { d: path(sample(-30, 0, 80, t => decay(t) + noise(t, 9) * 1.6).map(([t, v]) => [sx(t), sy(v)])), kind: "actual" },
      { d: path(forecast.map(([t, v]) => [sx(t), sy(v)])), kind: "ghost" },
      { d: path(planned.map(([t, v]) => [sx(t), sy(v)])), kind: "plan" },
    ],
    yTicks: [0, 40, 100].map(v => ({ v: `${v}`, y: sy(v) })),
    xTicks: [-30, -15, 0, 15, 30].map(v => ({ v: v === 0 ? "NOW" : `${v > 0 ? "+" : ""}${v} d`, x: sx(v) })),
    now: sx(0),
    window: [sx(service[0]), sx(service[1])],
    marks: [
      { x: sx(cross), y: sy(40) + 14, text: big ? "Failure risk · ~3 weeks" : "Failure risk · ~2 weeks", tone: "magma" },
      { x: sx(service[1]) + 6, y: sy(72), text: "Service window", tone: "led", anchor: "start" },
      { x: sx(22), y: sy(98) - 8, text: "After service", tone: "gold" },
    ],
  };
}

function smooth01(x: number) {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
}

const TONE = { magma: "#ff8f4a", led: "#7cc4ff", gold: "#e9b949" } as const;

export default function TwinChart({ model, cap, title }: { model: TwinModel; cap: TwinCap; title: string }) {
  const spec = useMemo(() => build(model, cap), [model, cap]);
  const id = useId().replace(/:/g, "");
  return (
    <figure className="relative">
      <figcaption className="mono mb-2 flex items-center justify-between gap-3 text-[0.58rem] uppercase tracking-[0.18em] text-white/55">
        <span>{title}</span>
        <span className="flex shrink-0 items-center gap-3 text-white/40">
          <span className="flex items-center gap-1.5"><i className="inline-block h-px w-4 bg-white" />AI GMS</span>
          <span className="flex items-center gap-1.5"><i className="inline-block h-px w-4 border-t border-dashed border-[#ff8f4a]" />{cap === "demand" || cap === "storage" ? "Forecast" : cap === "maintenance" ? "Trend" : "Without"}</span>
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`${title}. Illustrative simulation.`}>
        <defs>
          <clipPath id={`${id}-reveal`}>
            <motion.rect key={`${model}-${cap}`} x={0} y={0} height={H} initial={{ width: 0 }} animate={{ width: W }} transition={{ duration: 1.6, ease: [0.2, 0.8, 0.2, 1] }} />
          </clipPath>
          <linearGradient id={`${id}-band`} x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#3d8bff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#3d8bff" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {spec.yTicks.map(tick => (
          <g key={tick.v}>
            <line x1={L} x2={W - R} y1={tick.y} y2={tick.y} stroke="rgba(255,255,255,0.07)" />
            <text x={L - 6} y={tick.y + 3} textAnchor="end" className="fill-white/35 font-mono text-[9px]">{tick.v}</text>
          </g>
        ))}
        {spec.xTicks.map(tick => (
          <text key={tick.v} x={tick.x} y={H - 8} textAnchor="middle" className={`font-mono text-[9px] ${tick.v === "NOW" ? "fill-[#ff8f4a]" : "fill-white/35"}`}>{tick.v}</text>
        ))}
        {spec.window && <rect x={spec.window[0]} y={T} width={spec.window[1] - spec.window[0]} height={H - T - B} fill="rgba(255,90,31,0.08)" stroke="rgba(255,90,31,0.35)" strokeDasharray="3 3" />}
        <g clipPath={`url(#${id}-reveal)`}>
          {spec.series.map((s, i) => {
            if (s.kind === "band") return <path key={i} d={s.d} fill={`url(#${id}-band)`} />;
            if (s.kind === "bars-up") return <path key={i} d={s.d} fill="rgba(124,196,255,0.45)" />;
            if (s.kind === "bars-down") return <path key={i} d={s.d} fill="rgba(255,90,31,0.55)" />;
            if (s.kind === "limit") return <path key={i} d={s.d} fill="none" stroke="#ff5a1f" strokeOpacity="0.6" strokeDasharray="2 4" />;
            if (s.kind === "ghost") return <path key={i} d={s.d} fill="none" stroke="#ff8f4a" strokeOpacity="0.75" strokeWidth="1.3" strokeDasharray="5 4" />;
            if (s.kind === "forecast") return <path key={i} d={s.d} fill="none" stroke="#7cc4ff" strokeWidth="1.6" strokeDasharray="6 4" />;
            if (s.kind === "plan") return <path key={i} d={s.d} fill="none" stroke="#7cc4ff" strokeWidth="1.8" strokeDasharray="1 0" style={{ filter: "drop-shadow(0 0 4px rgba(124,196,255,0.6))" }} />;
            return <path key={i} d={s.d} fill="none" stroke="#f4efe6" strokeWidth="1.8" style={{ filter: "drop-shadow(0 0 3px rgba(255,255,255,0.35))" }} />;
          })}
          {spec.marks.map(mark => (
            <text key={mark.text} x={mark.x} y={mark.y} textAnchor={mark.anchor ?? "middle"} fill={TONE[mark.tone]} className="font-mono text-[9.5px] uppercase tracking-[0.08em]">{mark.text}</text>
          ))}
        </g>
        {spec.now !== undefined && (
          <g>
            <line x1={spec.now} x2={spec.now} y1={T} y2={H - B} stroke="#ff8f4a" strokeOpacity="0.55" />
            <circle cx={spec.now} cy={T} r="3" fill="#ff5a1f"><animate attributeName="r" values="2.5;5;2.5" dur="1.8s" repeatCount="indefinite" /></circle>
          </g>
        )}
      </svg>
    </figure>
  );
}
