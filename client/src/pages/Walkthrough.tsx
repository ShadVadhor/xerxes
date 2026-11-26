import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { createEngine, Engine, Mode } from "@/components/walk/engine";
import { Minimap, PoseSink } from "@/components/walk/Minimap";
import { Arrow, Logo } from "@/components/xerxes/ui";
import { setInterest } from "@/lib/interest";
import { STOPS, Stop, WALK_META, WALK_NOTE } from "@/lib/walkthrough";

const SITE = "https://www.xerxes.nexus";
const OG_IMAGE = "https://files.manuscdn.com/user_upload_by_module/session_file/310519664054510477/XNrLfNmWVqdFDHwN.jpg";

/** Route-specific head tags, restored when the page unmounts. */
function useRouteHead() {
  useEffect(() => {
    const undo: (() => void)[] = [];
    const url = `${SITE}${WALK_META.path}`;
    const meta = (sel: string, make: () => HTMLElement, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLElement>(sel);
      const created = !el;
      if (!el) {
        el = make();
        document.head.appendChild(el);
      }
      const prev = el.getAttribute(attr);
      el.setAttribute(attr, value);
      undo.push(() => {
        if (created) el!.remove();
        else if (prev !== null) el!.setAttribute(attr, prev);
      });
    };
    const named = (name: string, v: string) =>
      meta(`meta[name="${name}"]`, () => Object.assign(document.createElement("meta"), { name }), "content", v);
    const prop = (property: string, v: string) =>
      meta(`meta[property="${property}"]`, () => {
        const m = document.createElement("meta");
        m.setAttribute("property", property);
        return m;
      }, "content", v);
    const prevTitle = document.title;
    document.title = WALK_META.title;
    undo.push(() => (document.title = prevTitle));
    named("description", WALK_META.description);
    named("twitter:title", WALK_META.title);
    named("twitter:description", WALK_META.description);
    named("twitter:card", "summary_large_image");
    named("twitter:image", OG_IMAGE);
    prop("og:title", WALK_META.title);
    prop("og:description", WALK_META.description);
    prop("og:url", url);
    prop("og:type", "website");
    prop("og:image", OG_IMAGE);
    meta('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", url);
    return () => undo.reverse().forEach(f => f());
  }, []);
}

const isCoarse = () => typeof window !== "undefined" && (window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 900);

function useQuery() {
  return useMemo(() => {
    const q = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const n = parseInt(q.get("stop") ?? "", 10);
    return { stop: Number.isFinite(n) ? Math.max(0, Math.min(STOPS.length - 1, n)) : -1, still: q.has("still") };
  }, []);
}

function StopArticle({ s, i, compact }: { s: Stop; i: number; compact?: boolean }) {
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <span className="mono text-[0.62rem] uppercase tracking-[0.2em] text-magma-hi">{s.kicker}</span>
        {i > 0 && (
          <span className="mono text-[0.62rem] tracking-[0.14em] text-ceramic/50">
            {String(i).padStart(2, "0")} / {STOPS.length - 1}
          </span>
        )}
      </div>
      <h2 className="display mt-3 text-[1.7rem] leading-[1.02] text-ceramic sm:text-[2.15rem]">
        {s.title} <span className="accent-serif text-magma-hi">{s.accent}</span>
      </h2>
      <p className={`mt-3 text-[0.86rem] leading-relaxed text-ceramic/75 ${compact ? "line-clamp-3" : ""}`}>{s.body}</p>
      {!compact && (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10">
            {s.figures.map(f => (
              <div key={f.l} className="bg-obsidian/80 px-3 py-3">
                <dt className="display text-[1.05rem] leading-none text-ceramic sm:text-[1.2rem]">{f.v}</dt>
                <dd className="mono mt-2 text-[0.5rem] uppercase leading-snug tracking-[0.1em] text-ceramic/55">{f.l}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="mono rounded-full border border-magma/50 px-2 py-[3px] text-[0.5rem] uppercase tracking-[0.16em] text-magma-hi">Design target</span>
            <span className="mono text-[0.52rem] uppercase tracking-[0.12em] text-ceramic/45">{s.basis}</span>
          </div>
        </>
      )}
    </>
  );
}

export default function Walkthrough() {
  useRouteHead();
  const [, navigate] = useLocation();
  const q = useQuery();
  const reduced = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const coarse = useMemo(isCoarse, []);

  const hostRef = useRef<HTMLDivElement>(null);
  const hsRef = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const poseSink = useRef<PoseSink | null>(null);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [intro, setIntro] = useState(q.stop < 0);
  const [stop, setStop] = useState(Math.max(0, q.stop));
  const [shown, setShown] = useState(Math.max(0, q.stop));
  const [flying, setFlying] = useState(false);
  const [mode, setMode] = useState<Mode>("guided");
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [zone, setZone] = useState("Campus");
  const [depth, setDepth] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [hsOpen, setHsOpen] = useState<number | null>(null);
  const [hint, setHint] = useState(false);

  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const lowPower = window.innerWidth < 768 || (navigator.hardwareConcurrency || 8) <= 4;
    const eng = createEngine({
      host,
      hotspotLayer: hsRef.current,
      lowPower,
      reduced,
      still: q.still,
      startStop: Math.max(0, q.stop),
      onReady: () => setReady(true),
      onFail: why => setFailed(why),
      onStop: i => {
        setStop(i);
        setFlying(true);
        setEnded(false);
        setHsOpen(null);
        if (modeRef.current === "explore") setShown(i);
      },
      onArrive: i => {
        setShown(i);
        setFlying(false);
      },
      onZone: setZone,
      onDepth: setDepth,
      onPose: (x, z, yaw, y) => poseSink.current?.(x, z, yaw, y),
      onEnd: () => {
        setPlaying(false);
        setEnded(true);
      },
    });
    engine.current = eng;
    if (!eng) setFailed(prev => prev ?? "webgl");
    return () => {
      eng?.dispose();
      engine.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hotspots live in React; tell the engine when the set changes
  useEffect(() => {
    engine.current?.refreshHotspots();
  }, [shown, ready, mode]);

  const go = useCallback((i: number) => {
    setEnded(false);
    engine.current?.goTo(i);
  }, []);
  const next = useCallback(() => {
    setEnded(false);
    engine.current?.next();
  }, []);
  const prev = useCallback(() => {
    setEnded(false);
    engine.current?.prev();
  }, []);
  const togglePlay = useCallback(() => {
    setPlaying(p => {
      const n = !p;
      engine.current?.setPlaying(n);
      if (n) setEnded(false);
      return n;
    });
  }, []);
  const start = useCallback(() => {
    setIntro(false);
    setMode("guided");
    if (!reduced) {
      setPlaying(true);
      engine.current?.setPlaying(true);
    }
  }, [reduced]);
  const explore = useCallback(() => {
    setIntro(false);
    setMode("explore");
    setPlaying(false);
    engine.current?.setPlaying(false);
    engine.current?.setMode("explore");
    setHint(true);
    window.setTimeout(() => setHint(false), 9000);
  }, []);
  const switchMode = useCallback(
    (m: Mode) => {
      if (m === mode) return;
      setMode(m);
      setPlaying(false);
      engine.current?.setPlaying(false);
      engine.current?.setMode(m);
      if (m === "explore") {
        setHint(true);
        window.setTimeout(() => setHint(false), 9000);
      }
      if (m === "guided") setShown(stop);
    },
    [mode, stop]
  );
  const replay = useCallback(() => {
    setEnded(false);
    engine.current?.goTo(0);
    window.setTimeout(() => {
      setPlaying(true);
      engine.current?.setPlaying(true);
    }, 400);
  }, []);

  // keyboard (guided mode; explore handles movement in the engine)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (intro || failed) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "Escape" && mode === "explore") {
        switchMode("guided");
        return;
      }
      if (mode !== "guided") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === " " && tag !== "BUTTON" && tag !== "A") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intro, failed, mode, next, prev, togglePlay, switchMode]);

  const s = STOPS[shown];
  const showStops = !intro && mode === "guided";
  const lastStop = STOPS.length - 1;

  const contact = (e: React.MouseEvent) => {
    e.preventDefault();
    setInterest("Xerxes — hyperscale campus", "walkthrough");
    navigate("/#contact");
  };

  const stopsList = (
    <ol className="space-y-6">
      {STOPS.map((x, i) => (
        <li key={x.id}>
          <h3 className="display text-lg text-ceramic">
            {x.kicker}: {x.title} {x.accent}
          </h3>
          <p className="mt-1 text-sm text-ceramic/70">{x.body}</p>
          <ul className="mt-1 text-xs text-ceramic/60">
            {x.figures.map(f => (
              <li key={f.l}>
                {f.v} — {f.l}
              </li>
            ))}
          </ul>
          <span className="sr-only">{i}</span>
        </li>
      ))}
    </ol>
  );

  /* ---------- fallback: no WebGL ---------- */
  if (failed) {
    return (
      <div className="min-h-[100dvh] overflow-y-auto bg-obsidian text-ceramic">
        <div className="wrap py-10">
          <Link href="/" className="inline-block"><Logo size={28} /></Link>
          <p className="eyebrow mt-12">3D walkthrough</p>
          <h1 className="display mt-4 text-[clamp(2.2rem,6vw,4.6rem)] leading-[0.98]">
            Inside a Xerxes pod, <span className="accent-serif text-magma-hi">in words.</span>
          </h1>
          <p className="mt-5 max-w-[60ch] text-ceramic/75">
            Your browser could not start the interactive 3D view, so here is the same route as a written tour: hub, compute hall, cooling, NanoVault, wellheads, the 120 branches below, the biogas yard and the roof.
          </p>
          <div className="mt-12 max-w-[70ch]">{stopsList}</div>
          <p className="mono mt-12 max-w-[80ch] text-[0.62rem] leading-relaxed text-ceramic/50">{WALK_NOTE}</p>
          <a href="/#contact" onClick={contact} className="btn-magma mt-10 inline-flex">Request access to the white paper <Arrow /></a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-obsidian text-ceramic" data-walk>
      <h1 className="sr-only">{WALK_META.title}</h1>
      <div ref={hostRef} className="absolute inset-0" />

      {/* hotspots */}
      <div ref={hsRef} className="pointer-events-none absolute inset-0 z-[3] overflow-hidden" aria-hidden={mode !== "guided"}>
        {showStops &&
          s.hotspots.map((h, i) => (
            <div key={`${s.id}-${i}`} data-hs data-x={h.at[0]} data-y={h.at[1]} data-z={h.at[2]} className="absolute left-0 top-0 will-change-transform" style={{ opacity: 0, visibility: "hidden", transition: "opacity .7s ease" }}>
              <button
                type="button"
                data-ui
                onClick={() => setHsOpen(o => (o === i ? null : i))}
                onMouseEnter={() => !coarse && setHsOpen(i)}
                onMouseLeave={() => !coarse && setHsOpen(o => (o === i ? null : o))}
                onFocus={() => setHsOpen(i)}
                aria-label={`${h.label}: ${h.text}`}
                className="pointer-events-auto absolute -left-4 -top-4 grid h-8 w-8 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-magma-hi"
              >
                <span className="absolute inset-0 animate-ping rounded-full border border-magma-hi/60 [animation-duration:2.6s]" />
                <span className={`relative h-2.5 w-2.5 rounded-full border border-obsidian ${hsOpen === i ? "bg-white" : "bg-magma-hi"}`} />
              </button>
              <span className={`mono pointer-events-none absolute left-5 top-[-0.55rem] whitespace-nowrap rounded-sm bg-obsidian/70 px-2 py-1 text-[0.55rem] uppercase tracking-[0.14em] text-ceramic backdrop-blur-sm ${hsOpen === i ? "inline" : "hidden sm:inline"}`}>
                {h.label}
              </span>
              {hsOpen === i && (
                <div className="hs-card pointer-events-none rounded-sm border border-white/15 bg-obsidian/90 p-3 text-[0.74rem] leading-relaxed text-ceramic/85 backdrop-blur-md">
                  <div className="mono mb-1 text-[0.55rem] uppercase tracking-[0.16em] text-magma-hi">{h.label}</div>
                  {h.text}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* top bar */}
      <header data-ui className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-4 sm:px-7">
        <Link href="/" aria-label="Xerxes Data Centers, back to the site" className="flex items-center gap-3 text-white">
          <span className="sm:hidden"><Logo size={24} showWord={false} /></span>
          <span className="hidden sm:inline-flex"><Logo size={24} /></span>
          <span className="mono hidden text-[0.58rem] uppercase tracking-[0.2em] text-ceramic/60 lg:inline">← Back to site</span>
        </Link>
        {!intro && ready && (
          <div className="mono flex min-w-0 max-w-[46vw] items-center gap-2 rounded-full border border-white/15 bg-black/45 px-3 py-2 text-[0.58rem] uppercase tracking-[0.16em] text-ceramic/85 backdrop-blur-md">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-magma" />
            <span className="truncate" aria-live="polite">{mode === "explore" ? zone : s.zone}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {!intro && ready && !coarse && (
            <div className="mono hidden rounded-full border border-white/15 bg-black/45 p-1 text-[0.58rem] uppercase tracking-[0.16em] backdrop-blur-md md:flex" role="group" aria-label="Mode">
              {(["guided", "explore"] as Mode[]).map(m => (
                <button key={m} type="button" onClick={() => switchMode(m)} aria-pressed={mode === m} className={`rounded-full px-3 py-1.5 transition-colors ${mode === m ? "bg-white text-obsidian" : "text-ceramic/70 hover:text-white"}`}>
                  {m}
                </button>
              ))}
            </div>
          )}
          <a href="/#contact" onClick={contact} aria-label="Request access" className="btn-ghost !px-4 !py-2.5 !text-[0.6rem]">
            <span className="hidden sm:inline">Request access</span><span className="sm:hidden">Access</span>
          </a>
        </div>
      </header>

      {/* guided panel */}
      {showStops && ready && !ended && (
        <aside
          data-ui
          aria-live="polite"
          className={`absolute bottom-[5.2rem] left-3 right-3 z-10 rounded-sm border border-white/12 bg-obsidian/80 p-4 backdrop-blur-xl transition-all duration-700 sm:bottom-24 sm:left-7 sm:right-auto sm:w-[27rem] sm:p-6 ${flying ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"} ${open ? "max-h-[62dvh] overflow-y-auto sm:max-h-none sm:overflow-visible" : ""}`}
        >
          <div className="sm:hidden">
            <StopArticle s={s} i={shown} compact={!open} />
            <button type="button" onClick={() => setOpen(o => !o)} className="mono mt-3 text-[0.58rem] uppercase tracking-[0.16em] text-magma-hi">
              {open ? "Less" : "More + figures"}
            </button>
            {open && (
              <div className="mt-3">
                <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-white/10 bg-white/10">
                  {s.figures.map(f => (
                    <div key={f.l} className="bg-obsidian/80 px-2 py-2.5">
                      <dt className="display text-[0.95rem] leading-none">{f.v}</dt>
                      <dd className="mono mt-1.5 text-[0.46rem] uppercase leading-snug tracking-[0.08em] text-ceramic/55">{f.l}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mono mt-3 text-[0.5rem] uppercase tracking-[0.12em] text-ceramic/45">Design target · {s.basis}</p>
              </div>
            )}
          </div>
          <div className="hidden sm:block">
            <StopArticle s={s} i={shown} />
          </div>
        </aside>
      )}

      {/* end card */}
      {showStops && ready && ended && (
        <aside data-ui className="absolute bottom-[5.2rem] left-3 right-3 z-10 rounded-sm border border-white/12 bg-obsidian/85 p-5 backdrop-blur-xl sm:bottom-24 sm:left-7 sm:right-auto sm:w-[27rem] sm:p-7">
          <span className="mono text-[0.62rem] uppercase tracking-[0.2em] text-magma-hi">End of route</span>
          <h2 className="display mt-3 text-[2rem] leading-[1.02]">
            That is Xerxes. <span className="accent-serif text-magma-hi">Now the paper.</span>
          </h2>
          <p className="mt-3 text-[0.86rem] leading-relaxed text-ceramic/75">
            Every figure on this tour is a design target or modelled value from the White Paper. Request access to read the basis for each one, or walk the campus again.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/#contact" onClick={contact} className="btn-magma !px-5 !py-3">Request access <Arrow /></a>
            <button type="button" onClick={replay} className="btn-ghost !px-5 !py-3">Replay</button>
          </div>
        </aside>
      )}

      {/* explore hint */}
      {!intro && ready && mode === "explore" && (
        <div data-ui className="absolute bottom-24 left-7 z-10 max-w-[24rem] rounded-sm border border-white/12 bg-obsidian/80 p-4 backdrop-blur-xl">
          <div className="mono text-[0.58rem] uppercase tracking-[0.18em] text-magma-hi">Explore</div>
          <p className={`mt-2 text-[0.8rem] leading-relaxed text-ceramic/80 transition-opacity duration-700 ${hint ? "opacity-100" : "opacity-60"}`}>
            <span className="mono text-ceramic">W A S D</span> to move, drag to look, <span className="mono text-ceramic">Shift</span> to sprint, <span className="mono text-ceramic">Space</span> / <span className="mono text-ceramic">C</span> up and down. Use the timeline to jump between levels. <span className="mono text-ceramic">Esc</span> returns to the guided tour.
          </p>
        </div>
      )}

      {/* bottom bar */}
      {!intro && ready && (
        <div data-ui className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-4 pt-8 sm:gap-5 sm:px-7">
          {mode === "guided" && (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={prev} disabled={stop === 0} aria-label="Previous stop" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 disabled:opacity-30">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M10 3L5 8l5 5" /></svg>
              </button>
              <button type="button" onClick={togglePlay} aria-label={playing ? "Pause guided tour" : "Play guided tour"} className="grid h-12 w-12 place-items-center rounded-full bg-white text-obsidian transition-transform hover:scale-105">
                {playing ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1.5" width="3.4" height="11" /><rect x="8.6" y="1.5" width="3.4" height="11" /></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9-5.5z" /></svg>
                )}
              </button>
              <button type="button" onClick={next} disabled={stop === lastStop} aria-label="Next stop" className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 disabled:opacity-30">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 3l5 5-5 5" /></svg>
              </button>
            </div>
          )}
          {mode === "explore" && (
            <button type="button" onClick={() => switchMode("guided")} className="btn-ghost !px-4 !py-2.5 !text-[0.6rem]">Back to guided</button>
          )}
          <ol className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-xl" aria-label="Walkthrough stops">
            {STOPS.map((x, i) => (
              <li key={x.id} className="group relative flex-1">
                <button type="button" onClick={() => go(i)} aria-label={`${x.kicker}: ${x.title} ${x.accent}`} aria-current={i === stop ? "step" : undefined} className="flex h-8 w-full items-center">
                  <span className={`block h-[3px] w-full rounded-full transition-colors duration-500 ${i === stop ? "bg-magma" : i < stop ? "bg-white/70" : "bg-white/20 group-hover:bg-white/40"}`} />
                </button>
                <span className="mono pointer-events-none absolute bottom-9 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-obsidian/90 px-2 py-1 text-[0.52rem] uppercase tracking-[0.14em] text-ceramic opacity-0 transition-opacity group-hover:opacity-100 sm:block">
                  {x.kicker}
                </span>
              </li>
            ))}
          </ol>
          <p className="mono ml-auto hidden max-w-[22rem] text-[0.5rem] uppercase leading-relaxed tracking-[0.1em] text-ceramic/40 xl:block">Schematic scale · design targets</p>
        </div>
      )}

      {/* minimap */}
      {!intro && ready && !coarse && (
        <div data-ui className="absolute bottom-24 right-7 z-10 hidden w-[9.5rem] overflow-hidden rounded-sm border border-white/12 bg-obsidian/70 p-2 backdrop-blur-xl md:block lg:w-[11rem]">
          <Minimap current={stop} onGo={go} register={fn => (poseSink.current = fn)} depth={depth} />
        </div>
      )}

      {/* intro */}
      {intro && (
        <section data-ui className="absolute inset-0 z-20 flex items-end bg-gradient-to-r from-obsidian via-obsidian/75 to-transparent px-5 pb-10 pt-24 sm:items-center sm:px-10 sm:pb-0 lg:px-16">
          <div className="max-w-[40rem]">
            <p className="eyebrow">3D walkthrough</p>
            <p className="mono mt-4 text-[0.6rem] uppercase tracking-[0.2em] text-ceramic/55">Production Pod 1 · {STOPS.length - 1} stops · about three minutes</p>
            <h2 className="display mt-4 text-[clamp(2.6rem,7.4vw,6rem)] leading-[0.92]">
              Walk inside <span className="accent-serif text-magma-hi">Xerxes.</span>
            </h2>
            <p className="mt-6 max-w-[48ch] text-[0.98rem] leading-relaxed text-ceramic/75">
              From the hub's digital twin to the rock five kilometres below: compute halls, a water-free cooling plant, the NanoVault, the wellheads, 120 branches and the biogas bus that replaces batteries.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" disabled={!ready} onClick={start} className="btn-magma disabled:opacity-60">
                {ready ? (<>Start the guided tour <Arrow /></>) : "Building the campus…"}
              </button>
              {!coarse && (
                <button type="button" disabled={!ready} onClick={explore} className="btn-ghost disabled:opacity-40">Explore freely</button>
              )}
            </div>
            <p className="mono mt-8 max-w-[62ch] text-[0.56rem] leading-relaxed tracking-[0.04em] text-ceramic/45">{WALK_NOTE}</p>
          </div>
        </section>
      )}

      {/* loading veil (deep links) */}
      {!intro && !ready && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-obsidian">
          <span className="mono text-[0.62rem] uppercase tracking-[0.22em] text-ceramic/60">Building the campus…</span>
        </div>
      )}

      {/* content for crawlers and assistive tech */}
      <section className="sr-only" aria-label="Walkthrough contents">
        <p>{WALK_META.description}</p>
        {stopsList}
        <p>{WALK_NOTE}</p>
      </section>
    </div>
  );
}
