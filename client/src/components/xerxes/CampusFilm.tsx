import { A } from "@/lib/assets";
import { PROGRAMME } from "@/lib/content";
import FilmPlayer from "./FilmPlayer";

const FILM = PROGRAMME.film;

/**
 * The Xerxes campus film, at the foot of "08 — Programme status".
 * The film only loads when the visitor presses play; the chapter list seeks into it.
 */
export default function CampusFilm() {
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
        <FilmPlayer
          src={A.campusFilm}
          poster={A.campusFilmPoster}
          kicker="Xerxes · campus film"
          badge="3D concept render"
          blurb="Arrival, the hub, the power hall, the nano-shell roofs, the data hall and the whole campus from above."
          duration="3:08"
          durationSpoken="3 minutes 8 seconds"
          ariaLabel="Xerxes campus film: a 3D concept render of the campus, 3 minutes 8 seconds, with music"
          playLabel="Play the Xerxes campus film with sound, 3 minutes 8 seconds"
          chapters={FILM.chapters}
          chaptersLabel="Film chapters"
          chapterCols="lg:grid-cols-6"
          note={FILM.note}
        />
      </div>
    </div>
  );
}
