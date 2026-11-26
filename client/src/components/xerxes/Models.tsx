import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { A } from "@/lib/assets";
import { MODELS } from "@/lib/content";
import { requestContact } from "@/lib/interest";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import DtfAnatomy from "./DtfAnatomy";
import { Arrow, Eyebrow, LazyMount, SceneBoundary } from "./ui";

const CampusScene = lazy(() => import("./CampusScene"));

type Mode = "dtf" | "compare" | "xerxes";

const CAPTIONS: Record<Mode, string> = {
  dtf: "DTF — one re-entered well and one two-level building: compute on Level 2, power and cooling on Level 1. Four branches open, six reserve slots sealed. Robot-serviced, lights off.",
  compare: "Same principle, different scale. One well pad against twelve. Four to ten branches against 120.",
  xerxes: "XERXES — a hub and six pods over twelve well pads, two under every pod, fifty metres apart. Ten branches a pad: 120 in all.",
};

/** Key to the 3D model, per view. Colours match what is drawn in the scene. */
const LEGEND: Record<Mode, { c: string; dashed?: boolean; t: string }[]> = {
  dtf: [
    { c: "#3d8bff", t: "Level 2: two compute modules under a robotic gantry" },
    { c: "#ff7a3a", t: "Level 1: ORC-DC, BESS, absorption cooling, stimulation" },
    { c: "#e9b949", t: "One re-entered well: four open branches, six reserve slots sealed (gold)" },
    { c: "#46e3ff", t: "Motherbore probe down the middle" },
  ],
  compare: [
    { c: "#ffffff", t: "Left: DTF, one well pad" },
    { c: "#ff5a1f", t: "Right: Xerxes, twelve wells, 120 branches" },
  ],
  xerxes: [
    { c: "#ff5a1f", t: "Production branches carry heat up" },
    { c: "#3d8bff", t: "Injection branches carry fluid down" },
    { c: "#46e3ff", t: "Motherbore probe: acoustic, thermal, EM" },
    { c: "#8fd0ff", t: "Wind and cold gathered by the nano-shell roof" },
  ],
};

const SCALE_BARS = [
  { label: "Wells", a: 100 / 12, b: 100, aText: "1", bText: "12" },
  { label: "Branches", a: (10 / 120) * 100, b: 100, aText: "4 → 10", bText: "120" },
];

function ScaleBar({ label, a, b, aText, bText }: { label: string; a: number; b: number; aText: string; bText: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const bars = el.querySelectorAll<HTMLElement>("[data-bar]");
    if (prefersReducedMotion()) {
      bars.forEach(b => (b.style.transform = "scaleX(1)"));
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        gsap.to(bars, { scaleX: 1, duration: 1.6, ease: "power3.out", stagger: 0.18 });
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="grid grid-cols-[5.5rem_1fr] items-center gap-x-4 gap-y-2 sm:grid-cols-[8rem_1fr]">
      <span className="mono row-span-2 text-[0.64rem] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-[10px] flex-1 bg-black/[0.06]">
          <div data-bar className="h-full origin-left bg-ink" style={{ width: `${a}%`, transform: "scaleX(0)" }} />
        </div>
        <span className="mono w-28 shrink-0 text-[0.64rem] tracking-wider">DTF · {aText}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-[10px] flex-1 bg-black/[0.06]">
          <div
            data-bar
            className="h-full origin-left bg-gradient-to-r from-magma-lo via-magma to-magma-hi"
            style={{ width: `${b}%`, transform: "scaleX(0)" }}
          />
        </div>
        <span className="mono w-28 shrink-0 text-[0.64rem] tracking-wider text-magma-lo">XERXES · {bText}</span>
      </div>
    </div>
  );
}

export default function Models() {
  const [mode, setMode] = useState<Mode>("compare");
  const [noGl, setNoGl] = useState(false);

  return (
    <section id="models" className="surface-ceramic relative overflow-hidden py-[clamp(5rem,11vw,10rem)]">
      <div className="strata-lines pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="wrap relative">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Eyebrow>
              <span data-reveal>{MODELS.eyebrow}</span>
            </Eyebrow>
            <h2 data-reveal className="display mt-6 text-[clamp(2.6rem,6.4vw,6.4rem)]">
              {MODELS.title}
              <br />
              <span className="accent-serif text-magma">{MODELS.titleAccent}</span>
            </h2>
          </div>
          <p data-reveal className="text-[1.05rem] leading-relaxed text-muted-foreground lg:col-span-4">
            {MODELS.intro}
          </p>
        </div>

        {/* interactive viewer */}
        <div
          data-reveal
          className="relative mt-14 h-[min(74vh,700px)] min-h-[440px] overflow-hidden bg-obsidian text-white"
          style={{ backgroundImage: "radial-gradient(70% 80% at 50% 60%, #1a1f29 0%, #0b0d12 60%, #07080b 100%)" }}
        >
          <div className="strata-lines absolute inset-0 opacity-40" aria-hidden />
          <div className="absolute inset-0">
            {noGl ? (
              <div className="absolute inset-0">
                <img
                  src={mode === "dtf" ? A.dtfPad : A.hero}
                  alt={mode === "dtf" ? "A DTF: a two-level prefabricated building with a roof gantry beside a green steel wellhead, at dusk" : "Xerxes campus: a central hub with six compute pods at dusk"}
                  className="h-full w-full object-cover opacity-80"
                />
              </div>
            ) : (
              <LazyMount className="absolute inset-0">
                <SceneBoundary onError={() => setNoGl(true)}>
                  <Suspense fallback={null}>
                    <CampusScene mode={mode} onUnsupported={() => setNoGl(true)} />
                  </Suspense>
                </SceneBoundary>
              </LazyMount>
            )}
          </div>

          <div className="brackets" aria-hidden>
            <i />
          </div>

          {/* overlay UI */}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 sm:p-6">
            <div className="mono text-[0.62rem] uppercase tracking-[0.22em] text-white/50">
              <span className="text-magma-hi">●</span> Campus viewer
              <span className="hidden sm:inline"> · drag to orbit</span>
            </div>
            <div
              role="tablist"
              aria-label="Choose model"
              className="pointer-events-auto flex rounded-full border border-white/15 bg-black/50 p-1 backdrop-blur-md"
            >
              {MODELS.toggles.map(t => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={mode === t.id}
                  type="button"
                  onClick={() => setMode(t.id)}
                  className={`mono rounded-full px-4 py-2 text-[0.66rem] uppercase tracking-[0.16em] transition-all duration-500 ${
                    mode === t.id ? "bg-magma text-ink" : "text-white/70 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* key */}
          <ul key={`legend-${mode}`} className="pointer-events-none absolute left-4 top-[4.5rem] hidden max-w-[17rem] space-y-2 animate-in fade-in duration-700 md:block sm:left-6">
            {LEGEND[mode].map(l => (
              <li key={l.t} className="flex items-start gap-3 text-[0.72rem] leading-snug text-white/70">
                <span
                  aria-hidden
                  className="mt-[0.3rem] block h-[7px] w-[7px] shrink-0 rounded-full"
                  style={l.dashed ? { border: `1px dashed ${l.c}` } : { background: l.c, boxShadow: `0 0 8px ${l.c}` }}
                />
                {l.t}
              </li>
            ))}
          </ul>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-16 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <p key={mode} className="max-w-[52ch] text-[1.02rem] leading-snug text-white animate-in fade-in slide-in-from-bottom-2 duration-700">
              {CAPTIONS[mode]}
            </p>
            <span className="mono text-[0.6rem] uppercase tracking-[0.22em] text-white/45">{MODELS.viewerNote}</span>
          </div>
        </div>

        {/* scale index */}
        <div data-reveal className="mt-10 grid gap-6 border-y border-border py-8 lg:grid-cols-2 lg:gap-16">
          {SCALE_BARS.map(s => (
            <ScaleBar key={s.label} {...s} />
          ))}
        </div>

        {/* photographic split — deliberately unequal */}
        <div className="mt-[clamp(4rem,8vw,7rem)] grid gap-6 lg:grid-cols-12 lg:items-end">
          {MODELS.cards.map(c => {
            const small = c.id === "dtf";
            return (
              <article
                key={c.id}
                data-reveal
                className={`group relative overflow-hidden bg-obsidian text-white ${
                  small ? "h-[420px] lg:col-span-5 lg:h-[460px]" : "h-[480px] lg:col-span-7 lg:h-[680px]"
                }`}
              >
                <img
                  src={small ? A.dtfPad : A.hero}
                  alt={
                    small
                      ? "A Dark Token Factory: a two-level prefabricated building with a roof gantry beside a green steel wellhead, at dusk"
                      : "Xerxes campus — central hub with six compute pods at dusk"
                  }
                  loading="lazy"
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.06] ${small ? "object-[62%_50%]" : ""}`}
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${
                    small
                      ? "from-black/95 via-black/70 to-black/5 sm:via-black/60"
                      : "from-black/90 via-black/50 to-black/10 sm:via-black/30 sm:to-transparent"
                  }`}
                />
                <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
                  <span className="mono text-[0.64rem] uppercase tracking-[0.22em] text-magma-hi">{c.kind}</span>
                  <h3 className={`display mt-2 ${small ? "text-[clamp(2.6rem,5vw,4.5rem)]" : "text-[clamp(3.4rem,8vw,8rem)]"}`}>{c.name}</h3>
                  <p className="mt-3 max-w-[40ch] text-[0.98rem] leading-relaxed text-white/75">{c.line}</p>
                  <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-4">
                    {c.stats.map(s => (
                      <div key={s.k}>
                        <dt className="mono text-[0.58rem] uppercase tracking-[0.2em] text-white/45">{s.k}</dt>
                        <dd className="font-display text-2xl font-semibold">{s.v}</dd>
                      </div>
                    ))}
                  </dl>
                  {c.href && (
                    <a
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono mt-5 inline-flex w-fit items-center gap-2 border-b border-white/30 pb-1 text-[0.66rem] uppercase tracking-[0.2em] text-white/80 transition-colors hover:border-magma-hi hover:text-magma-hi"
                    >
                      {c.hrefLabel} <span aria-hidden>↗</span>
                    </a>
                  )}
                </div>
                <div className="brackets" aria-hidden>
                  <i />
                </div>
              </article>
            );
          })}
        </div>

        <DtfAnatomy />

        {/* inside a DTF */}
        <figure data-reveal className="group relative mt-[clamp(3rem,6vw,5rem)] h-[520px] overflow-hidden bg-obsidian text-white lg:h-[620px]">
          <img
            src={A.dtfRoom}
            alt="Inside a DTF compute level: immersion tanks and an overhead gantry with a robotic arm lifting a server sled, no people"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent lg:from-black/80 lg:via-black/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <figcaption className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 lg:justify-center lg:p-14">
            <span className="mono text-[0.64rem] uppercase tracking-[0.22em] text-magma-hi">{MODELS.room.eyebrow}</span>
            <h3 className="display mt-3 max-w-[14ch] text-[clamp(2.4rem,5vw,4.6rem)]">{MODELS.room.title}</h3>
            <p className="mt-4 max-w-[46ch] text-[0.98rem] leading-relaxed text-white/75">{MODELS.room.body}</p>
            <dl className="mt-6 grid max-w-[34rem] grid-cols-3 gap-4 border-t border-white/20 pt-4">
              {MODELS.room.stats.map(st => (
                <div key={st.label}>
                  <dd className="font-display text-[clamp(1.4rem,2.4vw,2rem)] font-semibold leading-none">
                    {st.value}
                    <span className="ml-1 text-[0.5em] font-medium text-magma-hi">{st.unit}</span>
                  </dd>
                  <dt className="mono mt-2 text-[0.52rem] uppercase leading-snug tracking-[0.14em] text-white/50">{st.label}</dt>
                </div>
              ))}
            </dl>
            <span className="mono mt-5 text-[0.58rem] uppercase tracking-[0.2em] text-white/40">{MODELS.room.caption} Targets, to be verified in the pilot.</span>
          </figcaption>
          <div className="brackets" aria-hidden>
            <i />
          </div>
        </figure>

        {/* spec table */}
        <div data-reveal className="mt-[clamp(3.5rem,7vw,6rem)]">
          <div className="hidden grid-cols-[0.8fr_1fr_1.3fr] gap-6 border-b border-ink/80 pb-3 md:grid">
            <span className="mono text-[0.64rem] uppercase tracking-[0.2em] text-muted-foreground">Specification</span>
            <span className="font-display text-xl font-bold">DTF</span>
            <span className="font-display text-xl font-bold text-magma">XERXES</span>
          </div>
          {MODELS.specs.map(r => (
            <div
              key={r.k}
              className="grid grid-cols-2 gap-x-6 gap-y-1 border-b border-border py-4 transition-colors hover:bg-black/[0.03] md:grid-cols-[0.8fr_1fr_1.3fr] md:gap-y-0"
            >
              <span className="mono col-span-2 text-[0.64rem] uppercase tracking-[0.2em] text-muted-foreground md:col-span-1 md:self-center">
                {r.k}
              </span>
              <span className="text-[0.98rem]">
                <span className="mono mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground md:hidden">DTF</span>
                {r.dtf}
              </span>
              <span className="text-[0.98rem] font-medium">
                <span className="mono mb-1 block text-[0.55rem] uppercase tracking-[0.2em] text-magma md:hidden">Xerxes</span>
                {r.xerxes}
              </span>
            </div>
          ))}
          <p className="mono mt-4 text-[0.62rem] tracking-[0.1em] text-muted-foreground">{MODELS.footnote}</p>
        </div>

        <div data-reveal className="mt-10 flex flex-wrap gap-3">
          <button type="button" className="btn-magma" onClick={() => requestContact("DTF — Dark Token Factory", "models")}>
            Enquire about DTF <Arrow />
          </button>
          <button type="button" className="btn-ghost" onClick={() => requestContact("Xerxes — hyperscale campus", "models")}>
            Enquire about Xerxes
          </button>
        </div>
      </div>
    </section>
  );
}
