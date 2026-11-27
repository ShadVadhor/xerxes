import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

export type FilmChapter = { t: number; label: string };

type FilmPlayerProps = {
  /** mp4 in project storage */
  src: string;
  poster: string;
  /** small label at the top-left of the poster */
  kicker: string;
  /** small label at the top-right of the poster */
  badge: string;
  /** one line at the bottom-left of the poster (hidden on small screens) */
  blurb: string;
  /** e.g. "7:13" */
  duration: string;
  /** e.g. "7 minutes 13 seconds" */
  durationSpoken: string;
  /** what the film is, for assistive technology */
  ariaLabel: string;
  playLabel?: string;
  chapters: FilmChapter[];
  chaptersLabel?: string;
  /** grid columns for the chapter strip on large screens */
  chapterCols?: string;
  /** small print under the strip */
  note?: string;
};

function clock(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

/**
 * A film that only loads when the visitor presses play (preload="none").
 * It plays with sound and native controls, pauses when it leaves the viewport,
 * and its chapter strip seeks into it. Used for the campus film and the explainer.
 */
export default function FilmPlayer({
  src,
  poster,
  kicker,
  badge,
  blurb,
  duration,
  durationSpoken,
  ariaLabel,
  playLabel,
  chapters,
  chaptersLabel = "Film chapters",
  chapterCols = "lg:grid-cols-6",
  note,
}: FilmPlayerProps) {
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
      // Choosing a chapter from the strip should bring the picture into view.
      const box = frame.current?.getBoundingClientRect();
      if (box && (box.top < 56 || box.bottom > window.innerHeight)) {
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        frame.current?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
      }
    }
    void element.play().catch(() => {
      /* playback was blocked; the native controls stay available */
    });
  }

  const active = chapters.reduce((index, chapter, i) => (now >= chapter.t ? i : index), -1);

  return (
    <div>
      <div ref={frame} className="group relative aspect-video overflow-hidden border border-white/12 bg-basalt">
        <video
          ref={video}
          className="absolute inset-0 h-full w-full bg-black object-contain"
          poster={poster}
          preload="none"
          playsInline
          controls={started}
          aria-label={ariaLabel}
          onLoadedMetadata={event => {
            if (pendingSeek.current !== null) {
              event.currentTarget.currentTime = pendingSeek.current;
              pendingSeek.current = null;
            }
          }}
          onPlay={() => setStarted(true)}
          onTimeUpdate={event => setNow(event.currentTarget.currentTime)}
        >
          <source src={src} type="video/mp4" />
        </video>

        {!started && (
          <button
            type="button"
            onClick={() => play()}
            aria-label={playLabel ?? `Play the film with sound, ${durationSpoken}`}
            className="absolute inset-0 block h-full w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-magma-hi"
          >
            <img
              src={poster}
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
              {kicker}
            </span>
            <span className="mono absolute right-5 top-5 hidden text-[0.56rem] uppercase tracking-[0.22em] text-white/50 sm:right-8 sm:top-8 sm:block">
              {badge}
            </span>

            <span className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <span className="relative grid h-16 w-16 place-items-center rounded-full bg-magma text-obsidian shadow-[0_0_40px_rgba(255,90,31,0.45)] transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none sm:h-24 sm:w-24">
                <span aria-hidden className="absolute inset-[-10px] rounded-full border border-magma/50 motion-safe:animate-ping" />
                <Play className="ml-1 h-6 w-6 fill-current sm:h-8 sm:w-8" strokeWidth={0} aria-hidden />
              </span>
              <span className="mono text-[0.58rem] uppercase tracking-[0.26em] text-white/80 sm:text-[0.62rem]">Play with sound · {duration}</span>
            </span>

            <span className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 sm:bottom-8 sm:left-8 sm:right-8">
              <span className="hidden max-w-[40ch] text-[0.9rem] leading-snug text-white/75 md:block">{blurb}</span>
              <span className="mono ml-auto border border-white/25 bg-obsidian/60 px-2.5 py-1 text-[0.56rem] tracking-[0.2em] text-white/80 backdrop-blur-sm">
                {duration.padStart(5, "0")}
              </span>
            </span>
          </button>
        )}
      </div>

      <ol className={`grid grid-cols-2 gap-px border border-t-0 border-white/12 bg-white/10 sm:grid-cols-3 ${chapterCols}`} aria-label={chaptersLabel}>
        {chapters.map((chapter, i) => {
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
      {note && <p className="mono mt-5 text-[0.6rem] tracking-[0.14em] text-white/40">{note}</p>}
    </div>
  );
}
