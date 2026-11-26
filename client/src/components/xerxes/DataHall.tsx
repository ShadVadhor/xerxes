import { useEffect, useRef } from "react";
import { A } from "@/lib/assets";
import { HALL, SHELL } from "@/lib/content";
import { gsap, prefersReducedMotion } from "@/lib/smooth";
import { Eyebrow } from "./ui";

const IMG: Record<string, string> = {
  hub: A.hubRender,
  hall: A.hall,
  cooling: A.cooling,
  rack: A.rack,
  command: A.command,
  wellpad: A.wellpad,
};

export default function DataHall() {
  const root = useRef<HTMLElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const galleryOuter = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  // play the fly-through only while visible
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !prefersReducedMotion()) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.15 }
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        panel.current,
        { clipPath: "inset(10% 8% 10% 8%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          ease: "none",
          scrollTrigger: { trigger: panel.current, start: "top 95%", end: "top 25%", scrub: 0.6 },
        }
      );
    });
    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const el = track.current;
      if (!el) return;
      const dist = () => Math.max(0, el.scrollWidth - window.innerWidth);
      gsap.to(el, {
        x: () => -dist(),
        ease: "none",
        scrollTrigger: {
          trigger: galleryOuter.current,
          start: "top top",
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          anticipatePin: 1,
        },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="compute" className="relative bg-obsidian">
      <div className="wrap relative pt-[clamp(5rem,10vw,9rem)]">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <Eyebrow>
              <span data-reveal>{HALL.eyebrow}</span>
            </Eyebrow>
            <h2 data-reveal className="display mt-6 text-[clamp(2.6rem,6.2vw,6.2rem)] text-white">
              {HALL.title}
              <br />
              <span className="accent-serif text-led-hi">{HALL.titleAccent}</span>
            </h2>
          </div>
          <p data-reveal className="text-[1.05rem] leading-relaxed text-white/65 lg:col-span-4">
            {HALL.intro}
          </p>
        </div>
      </div>

      {/* fly-through panel */}
      <div className="mt-14 px-[clamp(0.75rem,2vw,2rem)]">
        <div ref={panel} className="relative h-[78vh] min-h-[520px] overflow-hidden bg-basalt">
          <video
            ref={video}
            className="absolute inset-0 h-full w-full object-cover"
            src={A.hallVideo}
            poster={A.hallPoster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Fly-through visualisation of a Xerxes data hall"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-obsidian/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-obsidian/30" />
          <div className="scanline opacity-40" aria-hidden />
          <div className="brackets m-4 sm:m-6" aria-hidden>
            <i />
          </div>
          <div className="mono absolute left-6 top-6 flex items-center gap-3 text-[0.6rem] uppercase tracking-[0.22em] text-white/70 sm:left-9 sm:top-9">
            <span className="h-2 w-2 rounded-full bg-led shadow-[0_0_12px_#3d8bff]" />
            Data hall · interior visualisation
          </div>

          {/* callouts */}
          <ul className="absolute bottom-6 right-6 hidden w-[min(380px,32vw)] space-y-0 lg:block xl:bottom-10 xl:right-10">
            {HALL.callouts.map((c, i) => (
              <li key={c.label} data-reveal data-reveal-delay={String(i * 0.08)} className="border-t border-white/15 py-4 first:border-t-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-[clamp(2rem,3vw,3rem)] font-bold leading-none text-white">{c.value}</span>
                  <span className="font-display text-lg font-semibold text-led-hi">{c.unit}</span>
                </div>
                <div className="mono mt-1 text-[0.6rem] uppercase tracking-[0.18em] text-white/55">{c.label}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* mobile callouts */}
      <div className="wrap lg:hidden">
        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6">
          {HALL.callouts.map(c => (
            <li key={c.label} data-reveal className="border-t border-white/15 pt-4">
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold text-white">{c.value}</span>
                <span className="font-display text-base font-semibold text-led-hi">{c.unit}</span>
              </div>
              <div className="mono mt-1 text-[0.58rem] uppercase tracking-[0.16em] text-white/55">{c.label}</div>
            </li>
          ))}
        </ul>
      </div>


      {/* silicon: what the racks are built to host */}
      <div className="wrap mt-[clamp(4rem,8vw,7rem)]">
        <div data-reveal className="mono flex items-center gap-4 text-[0.66rem] uppercase tracking-[0.22em] text-led-hi">
          <span className="inline-block h-px w-10 bg-led" />
          {HALL.silicon.label}
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-px bg-white/10 sm:grid-cols-3 lg:grid-cols-5">
          {HALL.silicon.chips.map((c, i) => (
            <li
              key={c.name}
              data-reveal
              data-reveal-delay={String(i * 0.07)}
              className="group relative bg-obsidian p-5 transition-colors duration-500 hover:bg-[#0d1119] sm:p-6 lg:min-h-[168px]"
            >
              <span className="mono text-[0.58rem] tracking-[0.22em] text-white/35">{String(i + 1).padStart(2, "0")}</span>
              <div className="display mt-6 text-[clamp(1.25rem,1.9vw,1.7rem)] leading-[1.05] text-white">{c.name}</div>
              <div className="mono mt-3 text-[0.58rem] uppercase tracking-[0.18em] text-white/50">{c.sub}</div>
              <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-gradient-to-r from-led to-led-hi transition-transform duration-700 group-hover:scale-x-100" aria-hidden />
            </li>
          ))}
        </ul>
        <p data-reveal className="mono mt-4 max-w-[90ch] text-[0.6rem] leading-relaxed tracking-[0.1em] text-white/35">
          {HALL.silicon.note}
        </p>
      </div>

      {/* the shell: wind and cold in, heat recovered */}
      <div className="wrap mt-[clamp(5rem,10vw,9rem)]">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-5">
            <Eyebrow>
              <span data-reveal>{SHELL.eyebrow}</span>
            </Eyebrow>
            <h3 data-reveal className="display mt-6 text-[clamp(2.2rem,4.6vw,4.4rem)] text-white">
              {SHELL.title}
              <br />
              <span className="accent-serif text-led-hi">{SHELL.titleAccent}</span>
            </h3>
            <p data-reveal className="mt-6 max-w-[48ch] text-[1.02rem] leading-relaxed text-white/65">
              {SHELL.body}
            </p>
          </div>
          <figure data-reveal className="group relative aspect-[16/10] overflow-hidden bg-basalt lg:col-span-7">
            <img
              src={A.shell}
              alt={SHELL.alt}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[2200ms] ease-out group-hover:scale-[1.04]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-obsidian/10" />
            {/* wind and cold, drifting across the roof */}
            <svg aria-hidden viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
              {[
                "M -80 330 C 260 250, 520 440, 820 380 S 1300 300, 1700 420",
                "M -80 520 C 300 430, 560 640, 900 560 S 1360 470, 1700 600",
                "M -80 700 C 280 640, 600 820, 960 730 S 1380 660, 1700 770",
              ].map((d, i) => (
                <path
                  key={i}
                  d={d}
                  fill="none"
                  stroke="#bfe3ff"
                  strokeWidth={3 - i * 0.4}
                  strokeLinecap="round"
                  strokeDasharray="220 780"
                  style={{ animation: `streak-drift ${7 + i * 1.6}s linear ${i * 1.3}s infinite`, filter: "drop-shadow(0 0 8px #8fd0ff)" }}
                />
              ))}
            </svg>
            <div className="brackets m-3" aria-hidden>
              <i />
            </div>
            <figcaption className="mono absolute bottom-4 left-5 text-[0.58rem] uppercase tracking-[0.22em] text-white/60">
              Nano-shell roof · wind + cold capture
            </figcaption>
          </figure>
        </div>

        <ol className="relative mt-12 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {SHELL.steps.map((s, i) => (
            <li key={s.n} data-reveal data-reveal-delay={String(i * 0.08)} className="relative bg-obsidian p-6 sm:p-7">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[3px]"
                style={{
                  backgroundImage:
                    s.tone === "heat"
                      ? "repeating-linear-gradient(90deg, #ff5a1f 0 16px, rgba(255,90,31,0.25) 16px 48px)"
                      : "repeating-linear-gradient(90deg, #8fd0ff 0 16px, rgba(143,208,255,0.22) 16px 48px)",
                  backgroundSize: "48px 3px",
                  animation: "flow-x 2.4s linear infinite",
                }}
              />
              <div className="flex items-baseline gap-3">
                <span className={`mono text-[0.62rem] tracking-[0.22em] ${s.tone === "heat" ? "text-magma-hi" : "text-led-hi"}`}>{s.n}</span>
                <span className="display text-[1.6rem] text-white">{s.t}</span>
              </div>
              <p className="mt-3 max-w-[34ch] text-[0.94rem] leading-relaxed text-white/60">{s.d}</p>
            </li>
          ))}
        </ol>
        <p className="mono mt-4 text-[0.6rem] tracking-[0.12em] text-white/35">{SHELL.note}</p>
      </div>

      {/* horizontal gallery */}
      <div ref={galleryOuter} className="relative mt-[clamp(4rem,8vw,7rem)] overflow-hidden lg:h-screen">
        <div
          ref={track}
          className="flex h-full snap-x snap-mandatory items-center gap-5 overflow-x-auto px-[clamp(1.25rem,6vw,7.5rem)] pb-10 lg:w-max lg:snap-none lg:overflow-visible lg:pb-0 lg:motion-reduce:w-auto lg:motion-reduce:overflow-x-auto [scrollbar-width:none]"
          data-lenis-prevent-wheel=""
        >
          <div className="flex w-[82vw] shrink-0 snap-start flex-col justify-center pr-6 sm:w-[46vw] lg:w-[30vw]">
            <span className="mono text-[0.66rem] uppercase tracking-[0.22em] text-magma-hi">Inside Xerxes</span>
            <h3 className="display mt-4 text-[clamp(2.2rem,4vw,4rem)] text-white">
              Six rooms. <span className="accent-serif text-magma-grad">One machine.</span>
            </h3>
            <p className="mt-4 max-w-[36ch] text-white/60">
              From the hub to the rack: a walk through the spaces that turn geothermal heat into AI compute.
            </p>
            <span className="mono mt-8 hidden items-center gap-3 text-[0.6rem] uppercase tracking-[0.24em] text-white/40 lg:flex">
              Keep scrolling <span className="inline-block h-px w-10 bg-white/40" />
            </span>
          </div>
          {HALL.gallery.map((g, i) => (
            <figure
              key={g.key}
              className={`group relative h-[62vh] min-h-[380px] shrink-0 snap-start overflow-hidden bg-basalt ${
                g.key === "rack" ? "w-[72vw] sm:w-[40vw] lg:w-[26vw]" : "w-[86vw] sm:w-[62vw] lg:w-[44vw]"
              } ${i % 2 === 1 ? "lg:mt-[10vh]" : "lg:-mt-[6vh]"}`}
            >
              <img
                src={IMG[g.key]}
                alt={`${g.title} — ${g.caption}`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <span className="mono text-[0.6rem] uppercase tracking-[0.22em] text-white/50">
                  {String(i + 1).padStart(2, "0")} / {String(HALL.gallery.length).padStart(2, "0")}
                </span>
                <div className="display mt-2 text-[clamp(1.6rem,2.4vw,2.4rem)] text-white">{g.title}</div>
                <p className="mt-2 max-w-[40ch] text-[0.92rem] text-white/70">{g.caption}</p>
              </figcaption>
              <div className="brackets m-3" aria-hidden>
                <i />
              </div>
            </figure>
          ))}
          <div className="w-[8vw] shrink-0" aria-hidden />
        </div>
      </div>
      <p className="wrap mono pb-10 text-[0.6rem] tracking-[0.12em] text-white/35">{HALL.note}</p>
    </section>
  );
}
