import { A } from "@/lib/assets";
import { MODELS } from "@/lib/content";
import FilmPlayer from "./FilmPlayer";

const FILM = MODELS.film;

/**
 * The seven-minute explainer, at the head of "02 — Two models, one idea".
 * Narrated, scored and subtitled in English (the subtitles are part of the picture).
 */
export default function ExplainerFilm() {
  return (
    <div id="explainer" data-reveal className="relative mt-14 scroll-mt-24 bg-obsidian p-5 text-white sm:p-8 lg:p-12">
      <div className="strata-lines pointer-events-none absolute inset-0 opacity-30" aria-hidden />
      <div className="relative">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-7">
            <div className="mono flex items-center gap-3 text-[0.66rem] uppercase tracking-[0.24em] text-magma-hi">
              <span className="h-px w-8 bg-magma-hi/70" />
              {FILM.label}
            </div>
            <h3 className="display mt-5 max-w-[20ch] text-[clamp(1.9rem,4vw,3.8rem)]">
              {FILM.title}
              <br />
              <span className="accent-serif text-magma-grad">{FILM.titleAccent}</span>
            </h3>
          </div>
          <p className="text-[1rem] leading-relaxed text-white/65 lg:col-span-5">{FILM.body}</p>
        </div>

        <div className="mt-8 sm:mt-10">
          <FilmPlayer
            src={A.explainerFilm}
            poster={A.explainerPoster}
            kicker="Xerxes · explainer film"
            badge="Narrated · English subtitles"
            blurb="From five kilometres down to the last rack: how Xerxes is built layer by layer, and why it runs itself."
            duration="7:13"
            durationSpoken="7 minutes 13 seconds"
            ariaLabel="Xerxes, the future of data centers: a narrated cinematic explainer, 7 minutes 13 seconds, with music and burned-in English subtitles"
            playLabel="Play the Xerxes explainer film with sound, 7 minutes 13 seconds"
            chapters={FILM.chapters}
            chaptersLabel="Explainer film chapters"
            chapterCols="lg:grid-cols-4"
            note={FILM.note}
          />
        </div>
      </div>
    </div>
  );
}
