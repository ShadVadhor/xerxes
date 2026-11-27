import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { A } from "@/lib/assets";
import { PROGRAMME } from "@/lib/content";

const FILM = PROGRAMME.film;

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/**
 * The Xerxes campus film, at the foot of "08 — Programme status".
 * The film only loads when the visitor presses play (preload="none"); it plays with sound and
 * native controls, pauses when it leaves the viewport, and the chapter list seeks into it.
 */
export default function CampusFilm() {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const pendingSeek = useRef<number | null>(null);
  const [started, setStarted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const element = frame.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => !entry.isIntersecting || entry.intersectionRatio < 0.15)) video.current?.pause();
      },
      { threshold: 0.15 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function play(at?: number) {
    const element = video.current;
    if (!element) return;
    setStarted(true);
    if (at !== undefined) {
      if (element.readyState >= 1) element.currentTime = at;
      else pendingSeek.current = at;
      setNow(at);
    }
    void element.play().catch(() => {
      /* playback was blocked; the native controls stay available */
    });
  }

  const active = FILM.chapters.reduce((index, chapter, i) => (now >= chapter.t ? i : index), -1);

  return (
    <div id="ksa-film" className="wrap relative mt-[clamp(4rem,8vw,7rem)] scroll-mt-24 pb-[clamp(5rem,10vw,9rem)]">
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
        <div className="lg:col-span-7">
          <div data-reveal className="mono flex items-center gap-3 text-[0.66rem] uppercase tracking-[0.24em] text-magma-hi">
            <span className="h-px w-8 bg-magma-hi/70" />
            {FILM.label}
          </div>
          <h3 data-reveal className="display mt-5 max-w-[18ch] text-[clamp(2rem,4.4vw,4.2rem)] text-white">
            {FILM.title}
            <br />
            <span className="accent-serif text-magma-grad">{FILM.titleAccent}</span>
          </h3>
        </div>
        <p data-reveal className="text-[1rem] leading-relaxed text-white/65 lg:col-span-5">
          {FILM.body}
        </p>
      </div>

      <div data-reveal className="mt-10 sm:mt-12">
        <div ref={frame} className="group relative aspect-video overflow-hidden border border-white/12 bg-basalt">
          <video
            ref={video}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            poster={A.campusFilmPoster}
            preload="none"
            playsInline
            controls={started}
            aria-label="Xerxes campus film: a 3D concept render of the campus, 3 minutes 8 seconds, with music"
            onLoadedMetadata={event => {
              if (pendingSeek.current !== null) {
                event.currentTarget.currentTime = pendingSeek.current;
                pendingSeek.current = null;
              }
            }}
            onPlay={() => setStarted(true)}
            onTimeUpdate={event => setNow(event.currentTarget.currentTime)}
          >
            <source src={A.campusFilm} type="video/mp4" />
          </video>

          {!started && (
            <button
              type="button"
              onClick={() => play()}
              aria-label="Play the Xerxes campus film with sound, 3 minutes 8 seconds"
              className="absolute inset-0 block h-full w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-magma-hi"
            >
              <img
                src={A.campusFilmPoster}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full scale-[1.02] object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-[1.07] motion-reduce:transition-none motion-reduce:group-hover:scale-[1.02]"
              />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/20 to-obsidian/45" />
              <span aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(5,6,8,0.55)_100%)]" />
              <span aria-hidden className="brackets m-3 opacity-70 sm:m-5">
                <i />
              </span>
              <span className="mono absolute left-5 top-5 flex items-center gap-2.5 text-[0.56rem] uppercase tracking-[0.22em] text-white/75 sm:left-8 sm:top-8 sm:text-[0.6rem]">
                <span className="h-2 w-2 rounded-full bg-magma shadow-[0_0_12px_#ff5a1f]" />
                Xerxes · campus film
              </span>
              <span className="mono absolute right-5 top-5 hidden text-[0.56rem] uppercase tracking-[0.22em] text-white/50 sm:right-8 sm:top-8 sm:block">
                3D concept render
              </span>

              <span className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <span className="relative grid h-16 w-16 place-items-center rounded-full bg-magma text-obsidian shadow-[0_0_40px_rgba(255,90,31,0.45)] transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none sm:h-24 sm:w-24">
                  <span aria-hidden className="absolute inset-[-10px] rounded-full border border-magma/50 motion-safe:animate-ping" />
                  <Play className="ml-1 h-6 w-6 fill-current sm:h-8 sm:w-8" strokeWidth={0} aria-hidden />
                </span>
                <span className="mono text-[0.58rem] uppercase tracking-[0.26em] text-white/80 sm:text-[0.62rem]">Play with sound · 3:08</span>
              </span>

              <span className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 sm:bottom-8 sm:left-8 sm:right-8">
                <span className="hidden max-w-[34ch] text-[0.9rem] leading-snug text-white/75 md:block">
                  Arrival, the hub, the power hall, the nano-shell roofs, the data hall and the whole campus from above.
                </span>
                <span className="mono ml-auto border border-white/25 bg-obsidian/60 px-2.5 py-1 text-[0.56rem] tracking-[0.2em] text-white/80 backdrop-blur-sm">
                  03:08
                </span>
              </span>
            </button>
          )}
        </div>

        <ol className="grid grid-cols-2 gap-px border border-t-0 border-white/12 bg-white/10 sm:grid-cols-3 lg:grid-cols-6" aria-label="Film chapters">
          {FILM.chapters.map((chapter, i) => {
            const isActive = started && i === active;
            return (
              <li key={chapter.t} className="bg-obsidian">
                <button
                  type="button"
                  onClick={() => play(chapter.t)}
                  aria-current={isActive ? "true" : undefined}
                  aria-label={`Play from ${clock(chapter.t)}: ${chapter.label}`}
                  className={`group/ch relative flex h-full w-full flex-col gap-1.5 px-4 py-4 text-left transition-colors duration-300 hover:bg-basalt-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-magma-hi sm:px-5 ${isActive ? "bg-basalt-2" : ""}`}
                >
                  <span className={`mono text-[0.58rem] tracking-[0.2em] ${isActive ? "text-magma-hi" : "text-white/40 group-hover/ch:text-magma-hi"}`}>
                    {String(i + 1).padStart(2, "0")} · {clock(chapter.t)}
                  </span>
                  <span className={`text-[0.92rem] leading-snug ${isActive ? "text-white" : "text-white/70 group-hover/ch:text-white"}`}>{chapter.label}</span>
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 top-0 h-px origin-left bg-magma transition-transform duration-500 ${isActive ? "scale-x-100" : "scale-x-0 group-hover/ch:scale-x-100"}`}
                  />
                </button>
              </li>
            );
          })}
        </ol>
        <p className="mono mt-5 text-[0.6rem] tracking-[0.14em] text-white/40">{FILM.note}</p>
      </div>
    </div>
  );
}
