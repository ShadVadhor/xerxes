import { memo, useEffect, useRef } from "react";
import { STOPS } from "@/lib/walkthrough";

export type PoseSink = (x: number, z: number, yaw: number, y: number) => void;

const ZLINES = [84, 130, 160, 190, 215];
const WELLS: [number, number][] = [
  [-25, 226],
  [25, 226],
];

/** Top-down schematic of the campus: hub, Pod 1 zones, wells, yard and DAC field, with a live pose marker. */
function MinimapInner({ current, onGo, register, depth }: { current: number; onGo: (i: number) => void; register: (fn: PoseSink | null) => void; depth: number | null }) {
  const marker = useRef<SVGGElement>(null);
  useEffect(() => {
    register((x, z, yaw) => {
      const el = marker.current;
      if (!el) return;
      const rot = ((Math.PI - yaw) * 180) / Math.PI;
      el.setAttribute("transform", `translate(${x.toFixed(1)} ${(-z).toFixed(1)}) rotate(${rot.toFixed(1)})`);
    });
    return () => register(null);
  }, [register]);

  return (
    <div className="relative">
      <svg viewBox="-132 -272 264 330" className="block h-auto w-full" role="img" aria-label="Campus map: hub, Production Pod 1, wells, biogas yard and direct-air-capture field">
        <defs>
          <clipPath id="mm-clip">
            <rect x="-132" y="-272" width="264" height="330" />
          </clipPath>
        </defs>
        <g clipPath="url(#mm-clip)">
          {[1, 2, 3, 4, 5].map(k => (
            <rect key={k} x={-30} y={-250} width={60} height={190} rx={14} transform={`rotate(${k * 60})`} fill="rgba(236,232,224,0.03)" stroke="rgba(236,232,224,0.14)" strokeWidth={1} />
          ))}
          {/* yard + DAC */}
          <rect x={44} y={-232} width={72} height={106} rx={4} fill="rgba(255,150,60,0.06)" stroke="rgba(255,150,60,0.4)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={80} y={-174} textAnchor="middle" fontSize={10} fill="rgba(255,170,100,0.9)" fontFamily="JetBrains Mono, monospace">BIOGAS</text>
          <rect x={-120} y={-230} width={76} height={100} rx={4} fill="rgba(61,139,255,0.05)" stroke="rgba(124,196,255,0.4)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={-82} y={-178} textAnchor="middle" fontSize={10} fill="rgba(124,196,255,0.9)" fontFamily="JetBrains Mono, monospace">DAC</text>
          {/* hub + corridor */}
          <circle r={34.5} fill="rgba(236,232,224,0.04)" stroke="rgba(236,232,224,0.4)" strokeWidth={1.4} />
          <circle r={24.5} fill="none" stroke="rgba(61,139,255,0.55)" strokeWidth={1} strokeDasharray="2 2" />
          <circle r={15} fill="rgba(255,90,31,0.14)" stroke="rgba(255,120,60,0.8)" strokeWidth={1.2} />
          <rect x={-3} y={-62} width={6} height={28} fill="rgba(236,232,224,0.2)" />
          {/* pod 1 */}
          <rect x={-30} y={-250} width={60} height={190} rx={14} fill="rgba(236,232,224,0.07)" stroke="rgba(236,232,224,0.7)" strokeWidth={1.4} />
          {ZLINES.map(z => (
            <line key={z} x1={-30} x2={30} y1={-z} y2={-z} stroke="rgba(236,232,224,0.3)" strokeWidth={0.8} />
          ))}
          {WELLS.map(([x, z]) => (
            <circle key={x} cx={x} cy={-z} r={3.6} fill="#ff5a1f" stroke="#ffd0a8" strokeWidth={0.8} />
          ))}
          {/* stop markers */}
          {STOPS.map((s, i) => {
            if (i === 0) return null;
            const under = s.id === "subsurface";
            const x = under ? 0 : s.cam[0];
            const z = under ? 226 : s.cam[2];
            if (i === 1) return null;
            const on = i === current;
            return (
              <g key={s.id} transform={`translate(${x} ${-z})`} onClick={() => onGo(i)} style={{ cursor: "pointer" }} role="button" aria-label={`Go to stop: ${s.title} ${s.accent}`}>
                <circle r={9} fill="transparent" />
                <circle r={on ? 5.2 : 3.4} fill={on ? "#ff5a1f" : "rgba(236,232,224,0.55)"} stroke={on ? "#ffd0a8" : "none"} strokeWidth={1} />
                {on && <circle r={9} fill="none" stroke="rgba(255,90,31,0.5)" strokeWidth={1} />}
              </g>
            );
          })}
          <g ref={marker}>
            <path d="M0 -9 L6 7 L0 3.4 L-6 7 Z" fill="#7cc4ff" stroke="#07080b" strokeWidth={1} />
          </g>
        </g>
      </svg>
      {depth !== null && (
        <div className="absolute inset-0 grid place-items-center bg-obsidian/80 backdrop-blur-[2px]">
          <div className="text-center">
            <div className="mono text-[0.55rem] uppercase tracking-[0.22em] text-ceramic/60">Depth</div>
            <div className="display text-3xl text-magma-hi">{depth.toFixed(1)}<span className="mono ml-1 text-xs text-ceramic/70">km</span></div>
            <div className="relative mx-auto mt-3 h-24 w-px bg-white/25">
              <span className="absolute -left-[3px] h-[7px] w-[7px] rounded-full bg-magma" style={{ top: `${Math.min(100, (depth / 5) * 100)}%` }} />
            </div>
            <div className="mono mt-2 text-[0.5rem] uppercase tracking-[0.2em] text-ceramic/50">0 – 5 km · schematic 25 : 1</div>
          </div>
        </div>
      )}
    </div>
  );
}

export const Minimap = memo(MinimapInner);
