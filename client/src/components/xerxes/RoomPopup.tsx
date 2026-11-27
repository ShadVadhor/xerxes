import { useEffect, useState, type KeyboardEvent } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { A } from "@/lib/assets";
import { HALL, ROOMS, ROOMS_NOTE } from "@/lib/content";
import { scrollToId } from "@/lib/smooth";
import Popup, { PopupDescription, PopupTitle } from "./Popup";
import { LoopDiagram, RingsDiagram } from "./RoomDiagrams";
import WellPadAnatomy from "./WellPadAnatomy";

export const ROOM_IMG: Record<string, string> = {
  hub: A.hubRender,
  hall: A.hall,
  cooling: A.cooling,
  rack: A.rack,
  command: A.command,
  wellpad: A.wellpad,
};
const ROOM_AR: Record<string, number> = {
  hub: 2000 / 930,
  hall: 2400 / 1350,
  cooling: 2000 / 1125,
  rack: 1400 / 1750,
  command: 2400 / 1350,
  wellpad: 2000 / 1125,
};

type Part = { x: number; y: number; t: string; d: string };

function tipStyle(p: Part) {
  const side = p.x < 30 ? "right" : p.x > 70 ? "left" : "center";
  if (side === "center") {
    return { left: `${p.x}%`, top: `${p.y}%`, translate: `-50% ${p.y > 55 ? "calc(-100% - 24px)" : "24px"}` };
  }
  return {
    left: `${p.x}%`,
    top: `${p.y}%`,
    translate: `${side === "left" ? "calc(-100% - 24px)" : "24px"} ${p.y > 58 ? "calc(-100% + 10px)" : "-10px"}`,
  };
}

function AnnotatedImage({ src, alt, ar, parts, active, setActive }: { src: string; alt: string; ar: number; parts: Part[]; active: number | null; setActive: (i: number | null) => void }) {
  const p = active !== null ? parts[active] : null;
  return (
    <div className="mx-auto" style={{ width: `min(100%, calc(58vh * ${ar.toFixed(3)}))` }}>
      <div className="relative" style={{ aspectRatio: String(ar) }}>
        <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/15" />
        {parts.map((part, i) => (
          <button
            key={part.t}
            type="button"
            aria-label={`${i + 1}. ${part.t}`}
            aria-pressed={active === i}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            onClick={() => setActive(active === i ? null : i)}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full p-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            style={{ left: `${part.x}%`, top: `${part.y}%` }}
          >
            <span className="absolute inset-1.5 rounded-full border border-magma-hi" style={{ animation: `room-ping 2.4s ease-out ${i * 0.45}s infinite` }} aria-hidden />
            <span
              className={`mono relative flex h-7 w-7 items-center justify-center rounded-full text-[0.62rem] font-semibold shadow-[0_0_18px_rgba(255,90,31,0.7)] ring-2 ring-black/50 transition-transform duration-300 ${active === i ? "scale-125 bg-white text-obsidian" : "bg-magma text-white"}`}
            >
              {i + 1}
            </span>
          </button>
        ))}
        <AnimatePresence>
          {p && (
            <motion.div
              key={active}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute z-20 hidden w-[250px] border border-white/15 bg-obsidian/90 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md sm:block"
              style={tipStyle(p)}
            >
              <p className="mono text-[0.56rem] uppercase tracking-[0.2em] text-magma-hi">{String((active ?? 0) + 1).padStart(2, "0")}</p>
              <p className="mt-1 font-display text-[0.95rem] font-semibold leading-tight text-white">{p.t}</p>
              <p className="mt-1 text-[0.78rem] leading-snug text-white/65">{p.d}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* phones: the selected part reads below the render instead of over it */}
      <div className="mt-3 min-h-[3.6rem] border-l-2 border-magma pl-3 sm:hidden" aria-live="polite">
        {p ? (
          <>
            <p className="font-display text-[0.95rem] font-semibold leading-tight text-white">
              {(active ?? 0) + 1}. {p.t}
            </p>
            <p className="mt-1 text-[0.8rem] leading-snug text-white/60">{p.d}</p>
          </>
        ) : (
          <p className="mono pt-1 text-[0.58rem] uppercase tracking-[0.18em] text-white/45">Tap a number to see that part</p>
        )}
      </div>
    </div>
  );
}

function RoomActions({ stop, label, twin, onTwin }: { stop: number; label: string; twin: boolean; onTwin: () => void }) {
  return (
    <>
      <Link href={`/walkthrough?stop=${stop}`} className="mono inline-flex items-center gap-3 bg-magma px-4 py-3 text-[0.62rem] uppercase tracking-[0.2em] text-white transition-colors hover:bg-magma-hi">
        {label}
        <span aria-hidden>→</span>
      </Link>
      {twin && (
        <button
          type="button"
          onClick={onTwin}
          className="mono inline-flex items-center gap-3 border border-led-hi/40 px-4 py-3 text-[0.62rem] uppercase tracking-[0.2em] text-led-hi transition-colors hover:border-led-hi hover:text-white"
        >
          See the digital twin
          <span aria-hidden>↓</span>
        </button>
      )}
    </>
  );
}

export default function RoomPopup({ room, onChange }: { room: string | null; onChange: (key: string | null) => void }) {
  const order = HALL.gallery.map(g => g.key);
  const idx = room ? order.indexOf(room) : -1;
  const g = idx >= 0 ? HALL.gallery[idx] : null;
  const r = room ? ROOMS[room] : null;
  const [view, setView] = useState<"render" | "diagram">("render");
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    setView("render");
    setActive(null);
  }, [room]);

  const go = (step: number) => onChange(order[(idx + step + order.length) % order.length]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("[role=radiogroup],[role=tablist]")) return;
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  };
  const toTwin = () => {
    onChange(null);
    window.setTimeout(() => scrollToId("twin"), 380);
  };
  const prev = idx >= 0 ? HALL.gallery[(idx - 1 + order.length) % order.length] : null;
  const next = idx >= 0 ? HALL.gallery[(idx + 1) % order.length] : null;

  return (
    <Popup open={!!room} fixed onOpenChange={open => !open && onChange(null)} label={g ? `${g.title}: room explainer` : undefined} onKeyDown={onKeyDown}>
      {r && g && room && (
        <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={room}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="grid flex-1 lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[minmax(0,1fr)]"
            >
              {/* visual */}
              <div className="relative flex flex-col bg-[#05070a] px-4 pb-6 pt-16 sm:px-6 sm:pt-6 lg:col-span-7 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3 pr-0 sm:pr-28 lg:pr-0">
                  <span className="mono flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.22em] text-led-hi">
                    <span className="h-1.5 w-1.5 rounded-full bg-led-hi shadow-[0_0_8px_#7cc4ff]" />
                    {r.zone}
                  </span>
                  {r.diagram && (
                    <div role="tablist" aria-label="Visual" className="inline-flex border border-white/15 p-[3px]">
                      {(
                        [
                          ["render", "Render"],
                          ["diagram", r.diagramLabel ?? "Diagram"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={view === id}
                          onClick={() => setView(id)}
                          className={`mono px-3 py-1.5 text-[0.58rem] uppercase tracking-[0.18em] transition-colors ${view === id ? "bg-white text-obsidian" : "text-white/60 hover:text-white"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-1 items-center justify-center py-5">
                  {view === "render" || !r.diagram ? (
                    <AnnotatedImage src={ROOM_IMG[room]} alt={`${g.title}: ${g.caption}`} ar={ROOM_AR[room] ?? 16 / 9} parts={r.parts} active={active} setActive={setActive} />
                  ) : r.diagram === "rings" ? (
                    <div className="w-full">
                      <RingsDiagram />
                    </div>
                  ) : r.diagram === "loop" ? (
                    <div className="w-full">
                      <LoopDiagram />
                    </div>
                  ) : (
                    <WellPadAnatomy variant="xerxes" className="w-full" />
                  )}
                </div>
                <p className="mono hidden text-[0.58rem] uppercase tracking-[0.18em] text-white/40 sm:block">
                  {view === "render" || !r.diagram ? "Hover or tap the numbers" : "Schematic · not to scale"}
                </p>
              </div>

              {/* explainer */}
              <div className="flex flex-col px-5 pb-8 pt-7 sm:px-8 sm:pt-8 lg:col-span-5 lg:min-h-0 lg:overflow-y-auto lg:pt-16">
                <p className="mono text-[0.6rem] tracking-[0.22em] text-white/40">
                  {String(idx + 1).padStart(2, "0")} / {String(order.length).padStart(2, "0")} · Six rooms, one machine
                </p>
                <PopupTitle className="display mt-3 text-[clamp(2rem,3.4vw,3rem)] text-white">
                  {g.title}
                  <span className="accent-serif mt-1 block text-[0.62em] text-magma-grad">{r.accent}</span>
                </PopupTitle>
                <PopupDescription className="mt-4 text-[0.95rem] leading-relaxed text-white/65">{r.body}</PopupDescription>
                <ol className="mt-6 border-t border-white/10">
                  {r.parts.map((part, i) => (
                    <li key={part.t} className="border-b border-white/10">
                      <button
                        type="button"
                        onMouseEnter={() => view === "render" && setActive(i)}
                        onMouseLeave={() => setActive(null)}
                        onFocus={() => view === "render" && setActive(i)}
                        onClick={() => {
                          setView("render");
                          setActive(i);
                        }}
                        className={`flex w-full items-start gap-3 py-3 text-left transition-colors ${active === i ? "text-white" : "text-white/70 hover:text-white"}`}
                      >
                        <span className={`mono mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.55rem] transition-colors ${active === i ? "bg-white text-obsidian" : "bg-magma/90 text-white"}`}>{i + 1}</span>
                        <span>
                          <span className="block font-display text-[0.98rem] font-semibold leading-tight">{part.t}</span>
                          <span className="mt-1 block text-[0.82rem] leading-snug text-white/50">{part.d}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 grid grid-cols-3 gap-px bg-white/10">
                  {r.figures.map(f => (
                    <div key={f.l} className="bg-obsidian p-3">
                      <p className="font-display text-[clamp(1.05rem,1.7vw,1.4rem)] font-semibold leading-none tracking-[-0.03em] text-white">{f.v}</p>
                      <p className="mono mt-2 text-[0.52rem] uppercase leading-snug tracking-[0.12em] text-white/45">{f.l}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap gap-3 lg:hidden">
                  <RoomActions stop={r.stop} label={r.stopLabel} twin={!!r.twinLink} onTwin={toTwin} />
                </div>
                <p className="mono mt-6 text-[0.56rem] leading-relaxed tracking-[0.08em] text-white/35">{ROOMS_NOTE}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* room-to-room navigation */}
          <nav aria-label="Rooms" className="sticky bottom-0 z-20 grid shrink-0 grid-cols-2 border-t border-white/10 bg-obsidian/95 backdrop-blur sm:static lg:grid-cols-[1fr_auto_1fr]">
            {[
              { item: prev, step: -1, dir: "Previous" },
              { item: null, step: 0, dir: "Actions" },
              { item: next, step: 1, dir: "Next" },
            ].map(({ item, step, dir }) =>
              step === 0 ? (
                <div key={dir} className="hidden items-center gap-3 border-l border-white/10 px-6 lg:flex">
                  <RoomActions stop={r.stop} label={r.stopLabel} twin={!!r.twinLink} onTwin={toTwin} />
                </div>
              ) : item ? (
                <button
                  key={dir}
                  type="button"
                  onClick={() => go(step)}
                  className={`group flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.04] sm:px-8 ${step > 0 ? "justify-end border-l border-white/10 text-right" : ""}`}
                >
                  {step < 0 && <span className="text-magma-hi transition-transform group-hover:-translate-x-1" aria-hidden>←</span>}
                  <span className="min-w-0">
                    <span className="mono block text-[0.54rem] uppercase tracking-[0.2em] text-white/40">{dir}</span>
                    <span className="block truncate font-display text-[0.95rem] font-semibold text-white">{item.title}</span>
                  </span>
                  {step > 0 && <span className="text-magma-hi transition-transform group-hover:translate-x-1" aria-hidden>→</span>}
                </button>
              ) : null,
            )}
          </nav>
        </div>
      )}
    </Popup>
  );
}
