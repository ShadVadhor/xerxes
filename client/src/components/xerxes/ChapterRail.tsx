import { useEffect, useState } from "react";
import { CHAPTERS } from "@/lib/content";
import { ScrollTrigger, scrollToId } from "@/lib/smooth";

/** Left-hand chapter / depth rail (desktop). Uses difference blending so it reads on dark and ceramic sections. */
export default function ChapterRail({ ready }: { ready: boolean }) {
  const [active, setActive] = useState("top");

  useEffect(() => {
    const triggers: ScrollTrigger[] = [];
    const t = setTimeout(() => {
      CHAPTERS.forEach(c => {
        const el = document.getElementById(c.id);
        if (!el) return;
        triggers.push(
          ScrollTrigger.create({
            trigger: el,
            start: "top 55%",
            end: "bottom 55%",
            onToggle: self => self.isActive && setActive(c.id),
          })
        );
      });
    }, 400);
    return () => {
      clearTimeout(t);
      triggers.forEach(tr => tr.kill());
    };
  }, []);

  const idx = Math.max(
    0,
    CHAPTERS.findIndex(c => c.id === active)
  );

  return (
    <nav
      aria-label="Chapters"
      className={`pointer-events-none fixed left-5 top-1/2 z-40 hidden -translate-y-1/2 mix-blend-difference transition-opacity duration-700 xl:block ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="relative pointer-events-auto flex flex-col gap-[14px] text-white">
        <span className="absolute left-[3px] top-1 bottom-1 w-px bg-white/25" />
        <span
          className="absolute left-[3px] top-1 w-px bg-white transition-all duration-700"
          style={{ height: `calc(${(idx / (CHAPTERS.length - 1)) * 100}% - 0px)`, transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)" }}
        />
        {CHAPTERS.map((c, i) => {
          const on = c.id === active;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => scrollToId(c.id)}
              aria-current={on ? "true" : undefined}
              className="group relative flex items-center gap-3 text-left"
            >
              <span
                className={`relative z-10 block h-[7px] w-[7px] rounded-full transition-all duration-500 ${
                  on ? "scale-150 bg-white" : i <= idx ? "bg-white" : "bg-white/40"
                }`}
              />
              <span
                className={`mono whitespace-nowrap text-[0.58rem] uppercase tracking-[0.2em] transition-all duration-500 ${
                  on ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-70"
                }`}
              >
                {on ? <span className="group-hover:hidden">{c.n}</span> : null}
                <span className={on ? "hidden group-hover:inline" : ""}>
                  {c.n} · {c.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
