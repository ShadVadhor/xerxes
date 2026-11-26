import { useEffect, useRef, useState } from "react";
import { A } from "@/lib/assets";
import { HERO_PHASES, HERO_TELEMETRY } from "@/lib/content";
import { requestContact } from "@/lib/interest";
import { gsap, prefersReducedMotion, ScrollTrigger, scrollToId } from "@/lib/smooth";
import EmberField from "./EmberField";
import { Arrow, CountUp } from "./ui";

const LOOP = 22.1;

/** Position of the depth marker (0 = surface, 1 = reservoir) for a given film time */
function gaugeAt(t: number) {
  if (t < 6.2) return 0.04 + (t / 6.2) * 0.04;
  if (t < 18.2) {
    const k = (t - 6.2) / (18.2 - 6.2);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    return 0.08 + e * 0.9;
  }
  return 0.0;
}

export default function Hero({ ready }: { ready: boolean }) {
  const root = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const timecode = useRef<HTMLSpanElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const intensity = useRef(0.4);

  const [phase, setPhase] = useState(0);
  const [playing, setPlaying] = useState(!prefersReducedMotion());
  const [inView, setInView] = useState(true);
  const [src] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? A.heroVideoMobile : A.heroVideo
  );

  // HUD driven by the film's own clock
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let raf = 0;
    let current = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const t = v.currentTime % LOOP;
      let idx = HERO_PHASES.findIndex(p => t >= p.from && t < p.to);
      if (idx < 0) idx = 0;
      if (idx !== current) {
        current = idx;
        setPhase(idx);
        intensity.current = idx === 1 || idx === 2 ? 1 : idx === 0 ? 0.45 : 0.25;
      }
      HERO_PHASES.forEach((p, i) => {
        const el = bars.current[i];
        if (!el) return;
        const k = Math.min(1, Math.max(0, (t - p.from) / (p.to - p.from)));
        el.style.transform = `scaleX(${k})`;
      });
      if (timecode.current) {
        const s = Math.floor(t);
        const f = Math.floor((t - s) * 10);
        timecode.current.textContent = `T+00:${String(s).padStart(2, "0")}.${f}`;
      }
      if (marker.current) marker.current.style.transform = `translateY(${gaugeAt(t) * 100}%)`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // pause the film when it leaves the viewport
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing && inView) v.play().catch(() => {});
    else v.pause();
  }, [playing, inView]);

  // scroll-linked exit: media scales & dims, content drifts up
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.to(media.current, {
        scale: 1.14,
        yPercent: 8,
        opacity: 0.25,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(content.current, {
        yPercent: -14,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "70% top", scrub: true },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // intro choreography once the preloader has finished
  useEffect(() => {
    const items = root.current?.querySelectorAll<HTMLElement>("[data-hero-in]");
    const lines = root.current?.querySelectorAll<HTMLElement>("[data-hero-line]");
    if (!items || !lines) return;
    if (!ready) {
      gsap.set(items, { opacity: 0, y: 24 });
      gsap.set(lines, { yPercent: 110 });
      return;
    }
    if (prefersReducedMotion()) {
      gsap.set(items, { opacity: 1, y: 0 });
      gsap.set(lines, { yPercent: 0 });
      return;
    }
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.to(lines, { yPercent: 0, duration: 1.4, stagger: 0.14 }, 0.1).to(
      items,
      { opacity: 1, y: 0, duration: 1.1, stagger: 0.09 },
      0.5
    );
    return () => {
      tl.kill();
    };
  }, [ready]);

  useEffect(() => {
    const t = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => clearTimeout(t);
  }, []);

  const ph = HERO_PHASES[phase];

  return (
    <section ref={root} id="top" className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-obsidian">
      {/* film */}
      <div ref={media} className="absolute inset-0 will-change-transform">
        <video
          ref={video}
          className="h-full w-full object-cover"
          src={src}
          poster={A.heroPoster}
          muted
          loop
          playsInline
          preload="auto"
          autoPlay={!prefersReducedMotion()}
          aria-hidden
        />
      </div>

      {/* grading */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_70%_40%,transparent_30%,rgba(7,8,11,0.55)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-obsidian via-obsidian/55 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-[62%] bg-gradient-to-r from-obsidian/75 via-obsidian/25 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-obsidian/70 to-transparent" />
        <div className="grain absolute inset-0 overflow-hidden" />
      </div>

      <EmberField intensityRef={intensity} active={inView} className="mix-blend-screen" />

      {/* depth gauge */}
      <div aria-hidden className="pointer-events-none absolute right-5 top-[42%] hidden h-[30vh] -translate-y-1/2 md:block lg:right-8">
        <div className="mono absolute -top-6 right-0 text-[0.58rem] tracking-[0.25em] text-white/50">
          {phase === 3 ? "COMPUTE" : "SURFACE"}
        </div>
        <div className="relative h-full w-10">
          <div className="absolute right-0 top-0 h-full w-px bg-white/20" />
          {Array.from({ length: 25 }).map((_, i) => (
            <span
              key={i}
              className={`absolute right-0 h-px bg-white/30 ${i % 6 === 0 ? "w-4" : "w-2"}`}
              style={{ top: `${(i / 24) * 100}%` }}
            />
          ))}
          <div ref={marker} className="absolute left-0 top-0 h-full w-full">
            <div
              className="absolute right-0 top-0 flex -translate-y-1/2 items-center gap-2 transition-transform duration-700"
              style={{ transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)" }}
            >
              <span className="mono text-[0.58rem] tracking-[0.2em] text-magma-hi">{phase === 1 || phase === 2 ? "DEPTH" : ""}</span>
              <span className="h-[2px] w-6 bg-magma shadow-[0_0_14px_#ff5a1f]" />
            </div>
          </div>
        </div>
        <div className="mono absolute -bottom-6 right-0 text-[0.58rem] tracking-[0.25em] text-white/50">RESERVOIR</div>
      </div>

      {/* content */}
      <div ref={content} className="wrap relative z-10 flex h-full flex-col justify-end pb-6 pt-24 sm:pb-8">
        <button
          type="button"
          data-hero-in
          onClick={() => scrollToId("programme")}
          className="group mb-auto mt-4 inline-flex w-fit items-center gap-3 self-start rounded-full border border-white/15 bg-black/35 px-4 py-2 text-left backdrop-blur-md transition-colors hover:border-magma-hi sm:mt-6 md:self-end md:mr-16"
        >
          <span className="pulse-dot shrink-0" />
          <span className="mono text-[0.62rem] uppercase tracking-[0.18em] text-white/80">
            KSA programme on standby — resuming with partners
          </span>
          <Arrow className="text-magma-hi transition-transform group-hover:translate-x-1" />
        </button>

        <div data-hero-in className="eyebrow mb-4 hidden items-center gap-3 text-white/70 sm:flex">
          <span className="inline-block h-px w-8 bg-magma" />
          Xerxes Data Centers · Geothermal-embedded AI compute
        </div>

        <h1 className="display [text-shadow:0_2px_40px_rgba(0,0,0,0.35)] text-[clamp(2.7rem,8vw,8.4rem)] text-white">
          <span className="block overflow-hidden pb-[0.08em]">
            <span data-hero-line className="block">
              Power from <span className="accent-serif text-magma-grad pr-[0.06em]">below.</span>
            </span>
          </span>
          <span className="block overflow-hidden pb-[0.08em]">
            <span data-hero-line className="block">
              Intelligence above.
            </span>
          </span>
        </h1>

        <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p data-hero-in className="max-w-[52ch] text-[clamp(1rem,1.25vw,1.2rem)] leading-relaxed text-white/72">
              An off-grid, carbon-negative data center campus powered by the heat of the earth — engineered for up to 1.5
              ExaFLOPS of AI compute.
            </p>
            <div data-hero-in className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="btn-magma" onClick={() => scrollToId("technology")}>
                Descend into the system <Arrow />
              </button>
              <button
                type="button"
                className="btn-ghost text-white"
                onClick={() => requestContact("Partnership", "hero")}
              >
                Request access
              </button>
            </div>
          </div>

          {/* film HUD */}
          <div data-hero-in className="w-full max-w-[420px] md:ml-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="mono text-[0.62rem] tracking-[0.22em] text-magma-hi">{ph.tag}</span>
              <span ref={timecode} className="mono text-[0.62rem] tracking-[0.18em] text-white/50">
                T+00:00.0
              </span>
            </div>
            <p key={phase} className="min-h-[2.6em] text-[0.95rem] leading-snug text-white/85 animate-in fade-in slide-in-from-bottom-2 duration-700">
              {ph.line}
            </p>
            <div className="mt-3 flex items-center gap-2">
              {HERO_PHASES.map((p, i) => (
                <span key={p.tag} className="relative h-[2px] flex-1 overflow-hidden bg-white/20">
                  <span
                    ref={el => {
                      bars.current[i] = el;
                    }}
                    className="absolute inset-0 origin-left bg-magma"
                    style={{ transform: "scaleX(0)" }}
                  />
                </span>
              ))}
              <button
                type="button"
                aria-label={playing ? "Pause film" : "Play film"}
                onClick={() => setPlaying(p => !p)}
                className="ml-2 grid h-7 w-7 place-items-center rounded-full border border-white/25 text-white/80 transition-colors hover:border-magma-hi hover:text-magma-hi"
              >
                {playing ? (
                  <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
                    <rect width="3" height="10" />
                    <rect x="6" width="3" height="10" />
                  </svg>
                ) : (
                  <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor">
                    <path d="M0 0l9 5-9 5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* telemetry strip */}
        <div
          data-hero-in
          className="mt-6 grid grid-cols-3 border-t border-white/15 pt-4 sm:grid-cols-5"
        >
          {HERO_TELEMETRY.map((m, i) => (
            <div key={m.label} className={`pr-3 ${i > 2 ? "hidden sm:block" : ""}`}>
              <div className="font-display text-[clamp(1.4rem,2.6vw,2.4rem)] font-semibold leading-none text-white">
                <CountUp value={m.value} decimals={m.decimals} duration={2.2} />
                <span className="ml-1 text-[0.5em] font-medium text-magma-hi">{m.unit}</span>
              </div>
              <div className="mono mt-2 text-[0.58rem] uppercase tracking-[0.18em] text-white/50">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
