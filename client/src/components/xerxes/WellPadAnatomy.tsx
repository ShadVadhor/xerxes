import { useEffect, useMemo, useRef, useState } from "react";
import { PAD, PAD_BRANCHES, branchPath2D, smoothPath } from "@/lib/wellpad";

/**
 * One well pad, drawn the way the client drew it: wellhead → colloidal conductor casing → ring of ten reserve
 * slots → fountain of branches → motherbore probe → hot zone, with the AI 3D subsurface model HUD.
 * The toggle takes the pad from 4 open branches to all 10: the six sealed slots open one after another.
 * Schematic only; depths are fractions of the total depth, not to scale.
 */

type Variant = "dtf" | "xerxes";

const TEXT: Record<Variant, { top: string; well: string; boxA: string; boxB: string; label: string }> = {
  dtf: {
    top: "20 MWe PER WELL PAD",
    well: "RE-ENTERED WELL · SAME API",
    boxA: "BUILDING 1",
    boxB: "PHASE 2",
    label: "Diagram of one DTF well pad: a re-entered well with a short copper conductor casing, a ring of ten reserve slots, a motherbore probe and up to ten branches that fan out into hotter rock",
  },
  xerxes: {
    top: "UP TO 50 MW PER WELL · MODELLED",
    well: "ONE OF TWELVE WELLS",
    boxA: "COMPUTE POD",
    boxB: "2ND WELL · 50 m",
    label: "Diagram of one Xerxes well pad: a short copper conductor casing, a ring of ten reserve slots, a motherbore probe and ten branches, six producing and four injecting, that fan out into hotter rock",
  },
};

const W = 760;
const H = 744;
const CX = 300;
const SY = 104; // surface
const TD = 690; // total depth
const KICK = SY + (TD - SY) * PAD.casing;
const PROBE_Y = SY + (TD - SY) * 0.955;
const REACH = 232;
const ORANGE = "#ff6a2b";
const BLUE = "#4a96ff";
const GOLD = "#e9b949";
const CYAN = "#46e3ff";
const TEAL = "#2fd0c0";
const COPPER = "#c8773a";

function wave(kind: "acoustic" | "thermal" | "em", width: number, mid: number, amp: number) {
  const P = 30;
  const pts: string[] = [];
  for (let x = 0; x <= width + P * 2; x += 2) {
    const k = (x / P) * Math.PI * 2;
    let y = 0;
    if (kind === "acoustic") y = Math.sin(k) * 0.55 + Math.sin(k * 3) * 0.35;
    else if (kind === "thermal") y = Math.sin(k) * 0.9;
    else y = Math.max(-1, Math.min(1, Math.sin(k) * 2.4)) * 0.8;
    pts.push(`${x === 0 ? "M" : "L"}${x} ${(mid - y * amp).toFixed(1)}`);
  }
  return pts.join(" ");
}

export default function WellPadAnatomy({ variant = "dtf", className = "" }: { variant?: Variant; className?: string }) {
  const [n, setN] = useState<4 | 10>(4);
  const touched = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const t = TEXT[variant];
  const [narrow, setNarrow] = useState(false);

  // On phones the in-diagram labels would be unreadably small: crop the empty label column and show the key as HTML.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // The pad grows from 4 to 10 the first time it scrolls into view, unless the visitor has chosen already.
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(10);
      return;
    }
    let timer = 0;
    const io = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          timer = window.setTimeout(() => {
            if (!touched.current) setN(10);
          }, 2200);
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
    };
  }, []);

  const geometry = useMemo(
    () =>
      PAD_BRANCHES.map(b => {
        const pts = branchPath2D(b, { x0: CX, yKick: KICK, yTD: TD, maxReach: REACH });
        const specks = [0.2, 0.34, 0.48, 0.62, 0.76, 0.9].map((s, i) => {
          const idx = Math.min(pts.length - 1, Math.round(s * (pts.length - 1)));
          const [x, y] = pts[idx];
          return { x: x + ((i * 7 + b.rank * 3) % 9) - 4, y: y + ((i * 5 + b.rank) % 7) - 3, d: ((i * 0.37 + b.rank * 0.23) % 2.4).toFixed(2), s };
        });
        return { b, d: smoothPath(pts), end: pts[pts.length - 1], specks, slot: [CX + Math.cos((b.rank / 10) * Math.PI * 2 - 1.2) * 27, KICK + Math.sin((b.rank / 10) * Math.PI * 2 - 1.2) * 7] as [number, number] };
      }),
    [],
  );

  const open = (rank: number) => rank < PAD.initial || n === 10;
  const choose = (value: 4 | 10) => {
    touched.current = true;
    setN(value);
  };

  return (
    <div ref={root} className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Branches open on this pad" className="inline-flex border border-white/20 p-[3px]">
          {([4, 10] as const).map(v => (
            <button
              key={v}
              type="button"
              aria-pressed={n === v}
              onClick={() => choose(v)}
              className={`mono px-4 py-2 text-[0.64rem] uppercase tracking-[0.2em] transition-colors ${n === v ? "bg-magma text-white" : "text-white/60 hover:text-white"}`}
            >
              {v} branches
            </button>
          ))}
        </div>
        <span className="mono text-[0.6rem] uppercase tracking-[0.2em] text-white/50" aria-live="polite">
          {n === 4 ? "4 open · 6 reserve slots sealed" : "10 open · 6 production + 4 injection"}
        </span>
      </div>

      <svg viewBox={narrow ? `34 0 ${W - 150} ${H}` : `0 0 ${W} ${H}`} role="img" aria-label={t.label} className="h-auto w-full">
        <defs>
          <linearGradient id={`wpRock-${variant}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#14110f" />
            <stop offset="0.5" stopColor="#1a120d" />
            <stop offset="1" stopColor="#3a1608" />
          </linearGradient>
          <radialGradient id={`wpHeat-${variant}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#ff5a1f" stopOpacity="0.5" />
            <stop offset="1" stopColor="#ff5a1f" stopOpacity="0" />
          </radialGradient>
          <filter id={`wpGlow-${variant}`} x="-30%" y="-10%" width="160%" height="120%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <clipPath id={`wpHud-${variant}`}>
            <rect x="0" y="-4" width="84" height="28" />
          </clipPath>
        </defs>

        {/* rock */}
        <rect x="0" y={SY} width={W} height={H - SY} fill={`url(#wpRock-${variant})`} />
        {[190, 290, 400, 520, 610].map(y => (
          <path key={y} d={`M0 ${y} Q${W / 4} ${y - 9} ${W / 2} ${y} T${W} ${y}`} stroke="#fff" strokeOpacity="0.045" fill="none" />
        ))}
        <ellipse cx={CX} cy={PROBE_Y - 10} rx="330" ry="86" fill={`url(#wpHeat-${variant})`} />

        {/* hot zone: concentric teal ellipses */}
        {[
          [236, 34],
          [168, 24],
          [104, 15],
        ].map(([rx, ry], i) => (
          <ellipse key={i} cx={CX} cy={PROBE_Y} rx={rx} ry={ry} fill="none" stroke={TEAL} strokeOpacity={0.55 - i * 0.08} strokeWidth="1.2" />
        ))}

        {/* surface */}
        <rect x="0" y={SY - 3} width={W} height="3" fill="#2a2f37" />
        <rect x={CX - 7} y={SY - 30} width="14" height="27" fill="#2f7d4f" />
        <rect x={CX - 14} y={SY - 22} width="28" height="4" fill="#9aa3ad" />
        <circle cx={CX} cy={SY - 33} r="5" fill="#9aa3ad" />
        <text x={CX - 22} y={SY - 40} textAnchor="end" className="mono wp-lbl" fontSize="11" fill="#c9d96a">
          {t.well}
        </text>
        {/* Building 1 and Phase 2 */}
        <path d={`M${CX + 12} ${SY - 18} H${CX + 72}`} stroke={GOLD} strokeWidth="1.2" strokeDasharray="4 4" className="wp-dash" />
        <rect x={CX + 72} y={SY - 56} width="122" height="53" fill="#0e1218" stroke="#cfd6df" strokeOpacity="0.7" />
        <rect x={CX + 72} y={SY - 56} width="122" height="3" fill={CYAN} />
        <rect x={CX + 72} y={SY - 8} width="122" height="5" fill={ORANGE} />
        <text x={CX + 133} y={SY - 26} textAnchor="middle" className="mono wp-lbl" fontSize="11" fill="#e6eaf0">
          {t.boxA}
        </text>
        <rect x={CX + 208} y={SY - 56} width="110" height="53" fill="none" stroke={GOLD} strokeOpacity="0.75" strokeDasharray="5 4" />
        <text x={CX + 263} y={SY - 26} textAnchor="middle" className="mono wp-lbl" fontSize="11" fill={GOLD}>
          {t.boxB}
        </text>
        <text x={W - 10} y="26" textAnchor="end" className="mono wp-lbl" fontSize="15" fontWeight="700" fill={GOLD}>
          {t.top}
        </text>

        {/* colloidal conductor casing */}
        <rect x={CX - 8} y={SY} width="16" height={KICK - SY} fill="#2b170c" stroke={COPPER} strokeWidth="1.5" />
        <rect x={CX - 8} y={SY} width="16" height={KICK - SY} fill={COPPER} fillOpacity="0.28" />
        {[0.14, 0.38, 0.62, 0.86].map(k => (
          <rect key={k} x={CX - 12} y={SY + (KICK - SY) * k - 2.5} width="24" height="5" fill="#e0904a" />
        ))}
        {/* heat up the casing in orange, cooled fluid down in blue */}
        <line x1={CX - 3} x2={CX - 3} y1={SY} y2={KICK} stroke={ORANGE} strokeWidth="1.6" className="wp-flow-up" />
        <line x1={CX + 3} x2={CX + 3} y1={SY} y2={KICK} stroke={BLUE} strokeWidth="1.6" className="wp-flow-down" />

        {/* branches: glow, line, flowing beads */}
        {geometry.map(({ b, d, end }) => {
          const color = b.role === "production" ? ORANGE : BLUE;
          const isOpen = open(b.rank);
          const delay = b.initial ? 0 : (b.rank - PAD.initial) * 0.28;
          return (
            <g key={b.rank}>
              {!b.initial && <path d={d} fill="none" stroke="#fff" strokeOpacity="0.14" strokeDasharray="2 6" />}
              <g style={{ opacity: isOpen ? 1 : 0, transition: `opacity 0.2s ${delay}s` }}>
                <path d={d} fill="none" stroke={color} strokeWidth="6" strokeOpacity="0.5" filter={`url(#wpGlow-${variant})`} pathLength={1} strokeDasharray="1 1" style={{ strokeDashoffset: isOpen ? 0 : 1, transition: `stroke-dashoffset 1.5s cubic-bezier(.3,.7,.2,1) ${delay}s` }} />
                <path d={d} fill="none" stroke={color} strokeWidth="1.8" pathLength={1} strokeDasharray="1 1" style={{ strokeDashoffset: isOpen ? 0 : 1, transition: `stroke-dashoffset 1.5s cubic-bezier(.3,.7,.2,1) ${delay}s` }} />
                <path d={d} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="2.4" strokeLinecap="round" className={b.role === "production" ? "wp-bead" : "wp-bead wp-bead-rev"} />
              </g>
              <circle cx={end[0]} cy={end[1]} r={isOpen ? 4.5 : 0} fill={color} style={{ transition: `r 0.4s ${delay + 1.3}s` }} />
              <circle cx={end[0]} cy={end[1]} r={isOpen ? 11 : 0} fill={color} fillOpacity="0.22" style={{ transition: `r 0.5s ${delay + 1.3}s` }} />
            </g>
          );
        })}

        {/* N2 nanofoam specks */}
        {geometry.map(({ b, specks }) =>
          specks.map((s, i) => (
            <circle key={`${b.rank}-${i}`} cx={s.x} cy={s.y} r="1.5" fill="#eef2f8" className="wp-twinkle" style={{ animationDelay: `${s.d}s`, opacity: open(b.rank) ? undefined : 0 }} />
          )),
        )}

        {/* motherbore probe */}
        <line x1={CX} x2={CX} y1={KICK} y2={PROBE_Y} stroke={CYAN} strokeWidth="1.6" strokeDasharray="5 5" className="wp-dash" />
        <circle cx={CX} cy={PROBE_Y} r="14" fill={CYAN} fillOpacity="0.16" />
        <circle cx={CX} cy={PROBE_Y} r="5.5" fill="#c8f6ff" />
        <circle cx={CX} cy={PROBE_Y} r="14" fill="none" stroke={CYAN} strokeOpacity="0.7" className="wp-ping" style={{ transformOrigin: `${CX}px ${PROBE_Y}px` }} />

        {/* reserve-slot ring, with a cap on each slot */}
        <ellipse cx={CX} cy={KICK} rx="30" ry="8" fill="#171009" stroke={GOLD} strokeWidth="1.6" />
        {geometry.map(({ b, slot }) => {
          const color = b.role === "production" ? ORANGE : BLUE;
          const isOpen = open(b.rank);
          return (
            <circle key={b.rank} cx={slot[0]} cy={slot[1]} r={isOpen ? 3.4 : 3.8} fill={isOpen ? color : GOLD} style={{ transition: `fill 0.3s ${b.initial ? 0 : (b.rank - PAD.initial) * 0.28}s` }} />
          );
        })}

        {/* labels, with dotted leaders to the right-hand column */}
        {[
          { y: SY + 30, from: CX + 12, text: ["COLLOIDAL CONDUCTOR CASING"], color: "#ffd2a6" },
          { y: KICK + 4, from: CX + 32, text: ["RESERVE SLOTS · SEALED"], color: "#ffe6a8" },
          { y: PROBE_Y - 4, from: CX + 20, text: ["MOTHERBORE PROBE", "ACOUSTIC · THERMAL · EM"], color: "#aef2ff" },
        ].map(l => (
          <g key={l.text[0]} className="wp-lbl">
            <line x1={l.from} x2="548" y1={l.y} y2={l.y} stroke={l.color} strokeOpacity="0.55" strokeDasharray="1 4" strokeLinecap="round" />
            {l.text.map((line, i) => (
              <text key={line} x="554" y={l.y + 3 + i * 14} className="mono" fontSize={i ? 10.5 : 11.5} fill={l.color} fillOpacity={i ? 0.8 : 1}>
                {line}
              </text>
            ))}
          </g>
        ))}

        {/* AI 3D subsurface model */}
        <g transform="translate(12 128)" className="wp-lbl">
          <rect width="170" height="118" fill="#080c10" fillOpacity="0.85" stroke={CYAN} strokeOpacity="0.5" />
          <text x="10" y="17" className="mono" fontSize="10.5" fill={CYAN}>
            AI 3D SUBSURFACE MODEL
          </text>
          {(
            [
              ["ACOUSTIC", "acoustic", "#e8edf3"],
              ["THERMAL", "thermal", ORANGE],
              ["EM", "em", TEAL],
            ] as const
          ).map(([label, kind, color], i) => (
            <g key={label} transform={`translate(0 ${30 + i * 28})`}>
              <text x="10" y="14" className="mono" fontSize="8.5" fill={color} fillOpacity="0.85">
                {label}
              </text>
              <g clipPath={`url(#wpHud-${variant})`} transform="translate(80 0)">
                <path d={wave(kind, 84, 10, 8)} fill="none" stroke={color} strokeWidth="1.3" className="wp-wave" />
              </g>
            </g>
          ))}
        </g>

        {/* captions */}
        <text x="14" y={H - 14} className="mono wp-lbl" fontSize="12" fontWeight="700" fill="#ff8a4a">
          BRANCHES · 4 → 10 · DEEPER INTO HOTTER ROCK
        </text>
        <text x={W - 14} y={H - 14} textAnchor="end" className="mono wp-lbl" fontSize="11" fill="#aeb6c0">
          N2 NANOFOAM · AI-TIMED
        </text>
      </svg>

      <div className="mono mt-3 grid gap-2 text-[0.6rem] uppercase leading-snug tracking-[0.14em] text-white/70 sm:hidden">
        <div className="font-bold text-[#e9b949]">{t.top}</div>
        <div className="flex items-center gap-2">
          <i className="h-2 w-2 shrink-0 bg-[#c8773a]" aria-hidden /> Colloidal conductor casing
        </div>
        <div className="flex items-center gap-2">
          <i className="h-2 w-2 shrink-0 rounded-full bg-[#e9b949]" aria-hidden /> Reserve slots · sealed
        </div>
        <div className="flex items-center gap-2">
          <i className="h-2 w-2 shrink-0 rounded-full bg-[#46e3ff]" aria-hidden /> Motherbore probe · acoustic, thermal, EM
        </div>
        <div className="font-bold text-[#ff8a4a]">Branches · 4 → 10 · deeper into hotter rock</div>
      </div>
    </div>
  );
}
