import { AnimatePresence, motion } from "framer-motion";
import { COMPANY } from "@/lib/content";
import Popup, { PopupDescription, PopupTitle } from "./Popup";

type Entity = (typeof COMPANY.entities)[number];

export default function CompanyPopup({ id, onChange }: { id: string | null; onChange: (id: string | null) => void }) {
  const entity: Entity | undefined = COMPANY.entities.find(e => e.id === id);
  const others = COMPANY.entities.filter(e => e.id !== id);
  return (
    <Popup open={!!entity} onOpenChange={open => !open && onChange(null)} size="md" label={entity ? `${entity.name}: details` : undefined}>
      <AnimatePresence mode="wait" initial={false}>
        {entity && (
          <motion.div key={entity.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="relative">
            <div className="strata-lines pointer-events-none absolute inset-0 opacity-[0.12] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" aria-hidden />
            <div className="relative px-6 pb-8 pt-16 sm:px-10 sm:pt-10">
              <p className="mono flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.22em] text-magma-hi">
                <span className="h-px w-8 bg-magma" aria-hidden />
                {entity.detail.kicker}
              </p>
              <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 pr-0 sm:pr-20">
                <PopupTitle className="display text-[clamp(2rem,5vw,3.2rem)] text-white">{entity.name}</PopupTitle>
                <p className="font-display text-[clamp(2.6rem,6vw,4rem)] font-bold leading-none tracking-[-0.06em] text-transparent" style={{ WebkitTextStroke: "1px rgba(255,90,31,0.6)" }} aria-hidden>
                  {entity.year}
                </p>
              </div>
              <p className="mono mt-3 text-[0.64rem] uppercase tracking-[0.16em] text-white/50">{entity.place}</p>
              <PopupDescription className="mt-6 max-w-[60ch] text-[1rem] leading-relaxed text-white/70">{entity.detail.summary}</PopupDescription>

              <h3 className="mono mt-10 text-[0.6rem] uppercase tracking-[0.22em] text-white/45">Timeline</h3>
              <ol className="relative mt-5 space-y-7 pl-9">
                <span className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-magma via-magma/40 to-transparent" aria-hidden />
                {entity.detail.timeline.map((step, i) => (
                  <motion.li
                    key={step.when + step.what}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.18, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                    className="relative"
                  >
                    <span className="absolute -left-9 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border border-magma bg-obsidian" aria-hidden>
                      <span className="h-[5px] w-[5px] rounded-full bg-magma-hi shadow-[0_0_8px_#ff5a1f]" />
                    </span>
                    <p className="font-display text-[1.5rem] font-bold leading-none tracking-[-0.04em] text-white">{step.when}</p>
                    <p className="mt-2 font-display text-[1.02rem] font-semibold leading-snug text-magma-hi">{step.what}</p>
                    <p className="mt-1.5 max-w-[56ch] text-[0.9rem] leading-relaxed text-white/60">{step.body}</p>
                  </motion.li>
                ))}
              </ol>

              <h3 className="mono mt-10 text-[0.6rem] uppercase tracking-[0.22em] text-white/45">What it brings</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {entity.detail.brings.map(item => (
                  <li key={item} className="mono border border-white/15 bg-white/[0.03] px-3 py-2 text-[0.62rem] tracking-[0.06em] text-white/75">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <nav aria-label="Other companies" className="grid grid-cols-2 border-t border-white/10">
              {others.map((other, i) => (
                <button
                  key={other.id}
                  type="button"
                  onClick={() => onChange(other.id)}
                  className={`group px-6 py-4 text-left transition-colors hover:bg-white/[0.04] sm:px-10 ${i ? "border-l border-white/10" : ""}`}
                >
                  <span className="mono block text-[0.54rem] uppercase tracking-[0.2em] text-white/40">{other.year}</span>
                  <span className="mt-0.5 flex items-center gap-2 font-display text-[0.95rem] font-semibold text-white">
                    {other.name}
                    <span className="text-magma-hi transition-transform group-hover:translate-x-1" aria-hidden>→</span>
                  </span>
                </button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </Popup>
  );
}
