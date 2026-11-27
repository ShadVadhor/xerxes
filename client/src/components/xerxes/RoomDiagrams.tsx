import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/smooth";

/* ---------------------------------------------------------------------------------------------
 * Hub: four separate infrastructure rings (two active, two on automated standby) and six bridges.
 * ------------------------------------------------------------------------------------------- */
const CX = 320;
const CY = 190;
const RINGS = [
  { id: "A", r: 60 },
  { id: "B", r: 73 },
  { id: "C", r: 86 },
  { id: "D", r: 99 },
];

export function RingsDiagram() {
  const [fault, setFault] = useState(false);
  const touched = useRef(false);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(() => {
      if (!touched.current) setFault(f => !f);
    }, 3800);
    return () => window.clearInterval(id);
  }, []);
  const state = (id: string): "active" | "standby" | "fault" => {
    if (id === "A") return fault ? "fault" : "active";
    if (id === "B") return "active";
    if (id === "C") return fault ? "active" : "standby";
    return "standby";
  };
  const pods = Array.from({ length: 6 }, (_, i) => {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    return { i, a, x: CX + Math.cos(a) * 218, y: CY + Math.sin(a) * 140 };
  });
  return (
    <div>
      <svg viewBox="0 0 640 380" className="block h-auto w-full" role="img" aria-label="Hub ring diagram: four separate rings around the hub, two active and two on standby, joined to six pods by bridges.">
        <defs>
          <radialGradient id="rd-core" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#ff8f4a" stopOpacity="0.85" />
            <stop offset="0.55" stopColor="#ff5a1f" stopOpacity="0.25" />
            <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[150, 210].map(r => (
          <ellipse key={r} cx={CX} cy={CY} rx={r * 1.45} ry={r} fill="none" stroke="rgba(255,255,255,0.04)" />
        ))}
        {/* bridges with power and cooling moving out to the pods */}
        {pods.map(p => {
          const x0 = CX + Math.cos(p.a) * 104;
          const y0 = CY + Math.sin(p.a) * 104;
          const x1 = p.x - Math.cos(p.a) * 40;
          const y1 = p.y - Math.sin(p.a) * 24;
          const d = `M${x0.toFixed(1)} ${y0.toFixed(1)}L${x1.toFixed(1)} ${y1.toFixed(1)}`;
          return (
            <g key={p.i}>
              <path d={d} stroke="rgba(236,232,224,0.18)" strokeWidth="9" strokeDasharray="1.5 3.5" />
              <path d={d} stroke="rgba(236,232,224,0.35)" strokeWidth="1" />
              <circle r="2.6" fill="#ff8f4a">
                <animateMotion dur={`${2.2 + (p.i % 3) * 0.4}s`} repeatCount="indefinite" path={d} />
              </circle>
              <circle r="2.2" fill="#7cc4ff">
                <animateMotion dur={`${2.6 + (p.i % 2) * 0.5}s`} begin="1s" repeatCount="indefinite" path={d} keyPoints="1;0" keyTimes="0;1" calcMode="linear" />
              </circle>
            </g>
          );
        })}
        {pods.map(p => (
          <g key={`pod-${p.i}`}>
            <ellipse cx={p.x} cy={p.y} rx="42" ry="25" fill="rgba(13,16,21,0.9)" stroke="rgba(236,232,224,0.35)" />
            <ellipse cx={p.x} cy={p.y} rx="30" ry="16" fill="none" stroke="rgba(236,232,224,0.12)" strokeDasharray="2 3" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" className="font-mono" fontSize="11" letterSpacing="1.5" fill="rgba(236,232,224,0.8)">
              POD {p.i + 1}
            </text>
          </g>
        ))}
        {/* the four rings */}
        {RINGS.map(ring => {
          const s = state(ring.id);
          const color = s === "fault" ? "#ff3b3b" : s === "active" ? "#ff6a2a" : "#7cc4ff";
          return (
            <g key={ring.id}>
              {s === "active" && <circle cx={CX} cy={CY} r={ring.r} fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="7" />}
              <circle
                cx={CX}
                cy={CY}
                r={ring.r}
                fill="none"
                stroke={color}
                strokeWidth={s === "standby" ? 1.2 : 2.2}
                strokeOpacity={s === "standby" ? 0.55 : 1}
                strokeDasharray={s === "active" ? "6 14" : s === "fault" ? "2 7" : "2 6"}
                style={s === "active" ? { animation: `flow-dash ${1.1 + RINGS.indexOf(ring) * 0.25}s linear infinite` } : s === "fault" ? { animation: "pulse 0.6s ease-in-out infinite" } : undefined}
                className="transition-[stroke] duration-500"
              />
              <text x={CX + ring.r * 0.7071 + 4} y={CY - ring.r * 0.7071 - 3} className="font-mono" fontSize="10" fill={color}>
                {ring.id}
              </text>
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r="46" fill="url(#rd-core)" />
        <circle cx={CX} cy={CY} r="34" fill="#0d1015" stroke="rgba(255,143,74,0.7)" />
        <text x={CX} y={CY - 2} textAnchor="middle" className="font-mono" fontSize="11" letterSpacing="2" fill="#fff">
          HUB
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" className="font-mono" fontSize="7.5" letterSpacing="1.2" fill="rgba(255,255,255,0.55)">
          AI CONTROL
        </text>
      </svg>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <ul className="mono grid grid-cols-2 gap-x-6 gap-y-1.5 text-[0.6rem] uppercase tracking-[0.16em]">
          {RINGS.map(ring => {
            const s = state(ring.id);
            return (
              <li key={ring.id} className="flex items-center gap-2 text-white/70">
                <span className={`h-2 w-2 rounded-full ${s === "fault" ? "bg-[#ff3b3b]" : s === "active" ? "bg-magma" : "bg-led-hi/70"}`} />
                Ring {ring.id} · <span className={s === "fault" ? "text-[#ff6b6b]" : s === "active" ? "text-magma-hi" : "text-led-hi"}>{s === "fault" ? "Isolated" : s}</span>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => {
            touched.current = true;
            setFault(f => !f);
          }}
          className="mono border border-white/20 px-3 py-2 text-[0.6rem] uppercase tracking-[0.18em] text-white/80 transition-colors hover:border-magma hover:text-white"
        >
          {fault ? "Restore ring A" : "Simulate a ring fault"}
        </button>
      </div>
      <p className="mt-3 text-[0.86rem] leading-relaxed text-white/55" aria-live="polite">
        {fault
          ? "Ring A drifts. AI GMS isolates it and moves its load onto standby ring C in milliseconds, so every pod stays powered and cooled (simulated)."
          : "Power and cooling interlace on four separate rings around the hub. Two carry the load; two wait on automated standby. Six ribbed bridges carry them out to the pods."}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Cooling: sealed nano-CO₂ primary loop (no water) and a water secondary loop.
 * ------------------------------------------------------------------------------------------- */
type CoolMode = "conventional" | "liquid";

export function LoopDiagram() {
  const [mode, setMode] = useState<CoolMode>("conventional");
  const pct = mode === "conventional" ? 25 : 15;
  const flow = (s: number) => ({ animation: `flow-dash ${s}s linear infinite` });
  return (
    <div>
      <svg viewBox="0 0 640 330" className="block h-auto w-full" role="img" aria-label={`Cooling loop diagram: a sealed nano-CO₂ primary loop with no water, a heat exchanger, and a secondary water loop using about ${pct}% of a conventional data center's water.`}>
        <defs>
          <linearGradient id="ld-hot" x1="0" x2="1">
            <stop stopColor="#ff5a1f" />
            <stop offset="1" stopColor="#ffb27a" />
          </linearGradient>
        </defs>
        {/* labels */}
        <text x="192" y="40" textAnchor="middle" className="font-mono" fontSize="11" letterSpacing="2" fill="#7cc4ff">PRIMARY LOOP</text>
        <text x="192" y="56" textAnchor="middle" className="font-mono" fontSize="9.5" letterSpacing="1" fill="rgba(255,255,255,0.6)">sealed nano-CO₂ · 0 L water</text>
        <text x="452" y="40" textAnchor="middle" className="font-mono" fontSize="11" letterSpacing="2" fill="#5fd8ea">SECONDARY LOOP</text>
        <text x="452" y="56" textAnchor="middle" className="font-mono" fontSize="9.5" letterSpacing="1" fill="rgba(255,255,255,0.6)">water · ≈ {pct}% of conventional</text>
        {/* primary loop: hot run on top, cold return below */}
        <path d="M120 80 H312" fill="none" stroke="url(#ld-hot)" strokeWidth="3" strokeDasharray="8 12" style={flow(0.9)} />
        <path d="M312 260 H120" fill="none" stroke="#7cc4ff" strokeWidth="3" strokeDasharray="8 12" style={flow(1.1)} />
        <path d="M120 80 Q72 80 72 128 V212 Q72 260 120 260" fill="none" stroke="rgba(124,196,255,0.35)" strokeWidth="3" />
        <path d="M312 80 V260" fill="none" stroke="rgba(124,196,255,0.15)" strokeWidth="3" />
        {/* secondary loop */}
        <path d="M352 80 H528" fill="none" stroke="#5fd8ea" strokeWidth="3" strokeDasharray="8 12" style={flow(1.2)} />
        <path d="M528 260 H352" fill="none" stroke="#5fd8ea" strokeOpacity="0.85" strokeWidth="3" strokeDasharray="8 12" style={flow(1.4)} />
        <path d="M528 80 Q576 80 576 128 V212 Q576 260 528 260" fill="none" stroke="rgba(95,216,234,0.35)" strokeWidth="3" />
        {/* racks */}
        <rect x="24" y="112" width="96" height="116" fill="#0d1015" stroke="rgba(236,232,224,0.4)" />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <rect key={i} x="34" y={122 + i * 13} width="76" height="8" fill="rgba(124,196,255,0.12)" stroke="rgba(124,196,255,0.35)" strokeWidth="0.6" />
        ))}
        <circle cx="104" cy="126" r="3" fill="#ff5a1f">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.4s" repeatCount="indefinite" />
        </circle>
        <text x="72" y="296" textAnchor="middle" className="font-mono" fontSize="10" letterSpacing="1.5" fill="#fff">RACKS</text>
        <text x="72" y="312" textAnchor="middle" className="font-mono" fontSize="9" fill="rgba(255,255,255,0.5)">150 kW · cold plate</text>
        {/* heat exchanger: the boundary water never crosses */}
        <rect x="292" y="112" width="80" height="116" fill="#0d1015" stroke="rgba(236,232,224,0.5)" />
        <path d="M304 124 l14 10 -14 10 14 10 -14 10 14 10 -14 10 14 10" fill="none" stroke="#ff8f4a" strokeWidth="1.4" />
        <path d="M360 124 l-14 10 14 10 -14 10 14 10 -14 10 14 10 -14 10" fill="none" stroke="#5fd8ea" strokeWidth="1.4" />
        <path d="M332 108 V232" stroke="rgba(255,255,255,0.55)" strokeDasharray="3 3" />
        <text x="332" y="296" textAnchor="middle" className="font-mono" fontSize="10" letterSpacing="1.5" fill="#fff">HEAT EXCHANGER</text>
        <text x="332" y="312" textAnchor="middle" className="font-mono" fontSize="9" fill="rgba(255,255,255,0.5)">water never crosses</text>
        {/* chiller and shell on the secondary side */}
        <rect x="530" y="96" width="96" height="62" fill="#0d1015" stroke="rgba(95,216,234,0.55)" />
        <text x="578" y="122" textAnchor="middle" className="font-mono" fontSize="9.5" letterSpacing="1" fill="#fff">ABSORPTION</text>
        <text x="578" y="136" textAnchor="middle" className="font-mono" fontSize="9.5" letterSpacing="1" fill="#fff">CHILLER</text>
        <text x="578" y="150" textAnchor="middle" className="font-mono" fontSize="8" fill="rgba(255,255,255,0.5)">LiBr · waste heat</text>
        <rect x="530" y="182" width="96" height="62" fill="#0d1015" stroke="rgba(191,227,255,0.55)" />
        <text x="578" y="208" textAnchor="middle" className="font-mono" fontSize="9.5" letterSpacing="1" fill="#fff">ROOF SHELL</text>
        <text x="578" y="224" textAnchor="middle" className="font-mono" fontSize="8" fill="rgba(255,255,255,0.5)">wind + cold</text>
        {[0, 1, 2].map(i => (
          <path key={i} d={`M${540 + i * 6} ${264 + i * 12} q22 -8 44 0 t44 0`} fill="none" stroke="#bfe3ff" strokeOpacity="0.5" strokeDasharray="16 40" style={{ animation: `flow-dash ${2 + i * 0.4}s linear infinite` }} />
        ))}
        <text x="216" y="74" textAnchor="middle" className="font-mono" fontSize="8.5" fill="#ffb27a">hot CO₂ →</text>
        <text x="216" y="278" textAnchor="middle" className="font-mono" fontSize="8.5" fill="#7cc4ff">← cold CO₂</text>
      </svg>
      <div className="mt-5">
        <div role="radiogroup" aria-label="Cooling configuration" className="inline-flex border border-white/20 p-[3px]">
          {(
            [
              ["conventional", "Conventional cooling"],
              ["liquid", "Liquid or immersion"],
            ] as [CoolMode, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              onClick={() => setMode(id)}
              className={`mono px-3 py-2 text-[0.6rem] uppercase tracking-[0.16em] transition-colors ${mode === id ? "bg-[#5fd8ea] text-obsidian" : "text-white/60 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <div className="mono flex justify-between text-[0.58rem] uppercase tracking-[0.16em] text-white/50">
              <span>Conventional data center</span>
              <span>100%</span>
            </div>
            <div className="mt-1.5 h-2 bg-white/8">
              <div className="h-full w-full bg-white/30" />
            </div>
          </div>
          <div>
            <div className="mono flex justify-between text-[0.58rem] uppercase tracking-[0.16em] text-[#5fd8ea]">
              <span>Xerxes · {mode === "conventional" ? "conventional cooling" : "liquid or immersion"}</span>
              <span>≈ {pct}%</span>
            </div>
            <div className="mt-1.5 h-2 bg-white/8">
              <div className="h-full bg-gradient-to-r from-[#3d8bff] to-[#5fd8ea] transition-[width] duration-700 ease-out" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <p className="mt-3 text-[0.86rem] leading-relaxed text-white/55">
          Water is kept out of the primary loop because it could degrade the pipes of the nano-CO₂ circuit. It is used only in the secondary loop. Modelled values for a facility of equal scale.
        </p>
      </div>
    </div>
  );
}
