/**
 * Where the films and photographs live (public/media, imported from the design
 * canvas; see media/manifest.json for what each file was called there).
 *
 * A film is three files with one name: the mp4, a webm for browsers that
 * prefer it, and a poster frame shown until it plays.
 */
export interface FilmSources {
  mp4: string;
  webm: string;
  poster: string;
}

export function film(name: string): FilmSources {
  return {
    mp4: `/media/video/${name}.mp4`,
    webm: `/media/video/${name}.webm`,
    poster: `/media/posters/${name}.jpg`,
  };
}

export function image(name: string): string {
  return `/media/images/${name}.jpg`;
}

/** A catalogue image whose url ends in .mp4 is a film. */
export function isFilmUrl(url: string): boolean {
  return /\.mp4$/i.test(url);
}

/** The webm and poster that sit beside a catalogue film, found by name. */
export function filmFromUrl(url: string): FilmSources | null {
  const match = /^\/media\/video\/([\w-]+)\.mp4$/.exec(url);
  return match ? film(match[1]) : null;
}
