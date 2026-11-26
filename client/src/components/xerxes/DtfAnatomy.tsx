import { MODELS } from "@/lib/content";
import { Eyebrow } from "./ui";
import WellPadAnatomy from "./WellPadAnatomy";

const TONE: Record<string, string> = {
  heat: "#ff5a1f",
  store: "#c98a1b",
  cool: "#2a8fb8",
  stim: "#8a8f98",
};

function RobotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <rect x="3" y="5" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5V2.5M6 2.5h4" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="6" cy="9" r="1" fill="currentColor" />
      <circle cx="10" cy="9" r="1" fill="currentColor" />
    </svg>
  );
}

/** The deck's building diagram, drawn as live UI: Level 2 compute over Level 1 power, cooling, stimulation and storage. */
function Building() {
  const a = MODELS.anatomy;
  return (
    <div className="border border-ink/15 bg-[#f6f3ec]">
      {/* Level 2 */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <span className="mono text-[0.62rem] uppercase tracking-[0.2em] text-magma-lo">{a.level2.tag}</span>
          <span className="mono inline-flex items-center gap-2 text-[0.62rem] tracking-wide text-ink/70">
            <RobotIcon />
            {a.level2.rail}
          </span>
        </div>
        {/* gantry rail with a carriage that patrols it */}
        <div className="relative mt-4 h-6" aria-hidden>
          <div className="absolute inset-x-0 top-[0.62rem] border-t border-dashed border-led/80" />
          <div className="dtf-gantry absolute top-0 h-[0.85rem] w-[1.6rem] bg-led shadow-[0_0_14px_rgba(61,139,255,0.7)]" />
          <div className="dtf-gantry absolute top-[0.85rem] ml-[0.78rem] h-[0.55rem] w-px bg-led" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {a.level2.modules.map(m => (
            <div key={m.name} className="border-l-[3px] border-led bg-[#ebe7dc] px-4 py-4">
              <div className="font-display text-[1.05rem] font-semibold leading-tight">{m.name}</div>
              <div className="mt-1 text-[0.86rem] leading-snug text-muted-foreground">{m.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* service links between the levels */}
      <div className="relative grid grid-cols-2 border-y border-ink/10 bg-[#efebe2]">
        {a.links.map(l => {
          const color = l.id === "dc" ? TONE.heat : TONE.cool;
          return (
            <div key={l.id} className="relative flex h-[4.2rem] items-center justify-center gap-3 overflow-hidden">
              <div className="relative h-full w-3" aria-hidden>
                <span className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2" style={{ background: `${color}55` }} />
                <span
                  className="dtf-rise absolute bottom-2 left-1/2 h-[7px] w-[7px] -translate-x-1/2 rounded-full"
                  style={{ background: color, boxShadow: `0 0 10px ${color}`, animationDelay: l.id === "dc" ? "0s" : "0.9s" }}
                />
                <span className="absolute left-1/2 top-1.5 -translate-x-1/2 text-[0.6rem] leading-none" style={{ color }}>
                  ▲
                </span>
              </div>
              <span className="mono text-[0.62rem] uppercase tracking-[0.18em]" style={{ color }}>
                {l.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Level 1 */}
      <div className="p-4 sm:p-6">
        <span className="mono text-[0.62rem] uppercase tracking-[0.2em] text-magma-lo">{a.level1.tag}</span>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {a.level1.units.map(u => (
            <div key={u.name} className="bg-[#ebe7dc] px-4 pb-4 pt-3" style={{ borderTop: `3px solid ${TONE[u.tone]}` }}>
              <div className="font-display text-[1rem] font-semibold leading-tight">{u.name}</div>
              {"sub" in u && u.sub && <div className="mono mt-1 text-[0.62rem] tracking-wider" style={{ color: TONE[u.tone] }}>{u.sub}</div>}
              <div className="mt-2 text-[0.82rem] leading-snug text-muted-foreground">{u.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* headline figures */}
      <dl className="grid grid-cols-1 border-t border-ink/15 sm:grid-cols-3">
        {a.figures.map((f, i) => (
          <div key={f.label} className={`px-4 py-5 sm:px-6 ${i > 0 ? "border-t border-ink/10 sm:border-l sm:border-t-0" : ""}`}>
            <dd className="font-display text-[clamp(1.8rem,3vw,2.5rem)] font-semibold leading-none">
              {f.value}
              {f.unit && <span className="ml-1 text-[0.5em] font-medium text-magma-lo">{f.unit}</span>}
            </dd>
            <dt className="mono mt-2 text-[0.58rem] uppercase leading-snug tracking-[0.14em] text-muted-foreground">{f.label}</dt>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The DTF well pad: re-entered well, short copper casing, ring of ten slots, four branches growing to ten. */
function Spine() {
  const s = MODELS.spine;
  return (
    <div id="dtf-pad" className="relative overflow-hidden bg-obsidian text-white" style={{ backgroundImage: "radial-gradient(80% 60% at 50% 100%, rgba(255,90,31,0.16), transparent 70%)" }}>
      <div className="strata-lines absolute inset-0 opacity-30" aria-hidden />
      <div className="relative grid gap-10 p-6 sm:p-10 lg:grid-cols-12 lg:gap-12 lg:p-12">
        <div className="lg:col-span-7 lg:self-center">
          <WellPadAnatomy variant="dtf" />
          <p className="mono mt-3 text-[0.58rem] uppercase leading-relaxed tracking-[0.16em] text-white/45">
            Schematic · branch depths are fractions of total depth, not to scale · design basis, to be verified in the pilot
          </p>
        </div>

        <div className="lg:col-span-5 lg:pt-4">
          <Eyebrow className="text-white/60">{s.eyebrow}</Eyebrow>
          <h3 className="display mt-5 text-[clamp(2.2rem,4.2vw,3.9rem)]">
            {s.title}
            <br />
            <span className="accent-serif text-magma-hi">{s.titleAccent}</span>
          </h3>
          <p className="mt-6 max-w-[56ch] text-[1rem] leading-relaxed text-white/70">{s.intro}</p>

          <ol className="mt-8 divide-y divide-white/10 border-y border-white/10">
            {s.steps.map(st => (
              <li key={st.n} className="grid grid-cols-[2.4rem_1fr] gap-x-4 py-4 sm:grid-cols-[3rem_1fr]">
                <span className="font-display text-2xl text-magma-hi">{st.n}</span>
                <div>
                  <span className="mono text-[0.58rem] uppercase tracking-[0.2em] text-white/45">{st.tag}</span>
                  <div className="mt-1 font-display text-[1.05rem] font-semibold leading-snug">{st.title}</div>
                  <p className="mt-1 text-[0.88rem] leading-relaxed text-white/60">{st.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <dl className="mt-8 grid grid-cols-3 gap-4">
            {s.figures.map(f => (
              <div key={f.label}>
                <dd className="font-display text-[clamp(1.4rem,2.2vw,2rem)] font-semibold leading-none">
                  {f.value}
                  {f.unit && <span className="ml-1 text-[0.5em] font-medium text-magma-hi">{f.unit}</span>}
                </dd>
                <dt className="mono mt-2 text-[0.55rem] uppercase leading-snug tracking-[0.14em] text-white/45">{f.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="brackets" aria-hidden>
        <i />
      </div>
    </div>
  );
}

export default function DtfAnatomy() {
  const a = MODELS.anatomy;
  return (
    <div className="mt-[clamp(4rem,8vw,7rem)]">
      <div data-reveal className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Eyebrow>{a.eyebrow}</Eyebrow>
          <h3 className="display mt-5 text-[clamp(2.4rem,5vw,4.8rem)]">
            {a.title}
            <br />
            <span className="accent-serif text-magma">{a.titleAccent}</span>
          </h3>
        </div>
        <p className="text-[1.02rem] leading-relaxed text-muted-foreground lg:col-span-5">{a.intro}</p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-12">
        <div data-reveal className="lg:col-span-7">
          <Building />
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-foreground">Three DTF classes</span>
            {a.classes.map(c => (
              <span key={c.name} className="inline-flex items-baseline gap-2">
                <span className="mono border border-ink/25 px-2 py-[3px] text-[0.64rem] tracking-wider">{c.name}</span>
                <span className="text-[0.8rem] text-muted-foreground">{c.sub}</span>
              </span>
            ))}
          </div>
        </div>

        <aside data-reveal className="flex flex-col border border-ink/15 bg-[#f6f3ec] p-5 sm:p-7 lg:col-span-5">
          <span className="mono text-[0.62rem] uppercase tracking-[0.2em] text-magma-lo">{a.designedOut.title} · today&apos;s build bottlenecks</span>
          <ul className="mt-4 divide-y divide-ink/10">
            {a.designedOut.items.map(i => (
              <li key={i.k} className="py-3.5">
                <div className="font-display text-[1rem] font-semibold">{i.k}</div>
                <p className="mt-1 text-[0.88rem] leading-snug text-muted-foreground">{i.v}</p>
              </li>
            ))}
          </ul>
          <p className="accent-serif mt-auto pt-8 text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.1] text-magma-lo">
            Fewer things to build, fewer things to wait for.
          </p>
        </aside>
      </div>
      <p data-reveal className="mono mt-4 max-w-[110ch] text-[0.62rem] leading-relaxed tracking-[0.08em] text-muted-foreground">
        {a.note}
      </p>

      <div data-reveal className="mt-[clamp(2.5rem,5vw,4rem)]">
        <Spine />
      </div>
    </div>
  );
}
