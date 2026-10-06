'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { FilmSources } from '@/lib/media';

/**
 * A film that behaves.
 *
 * The poster frame is a real optimised image underneath, so the page paints
 * and its largest-contentful-paint element is a picture, not a 4 MB download.
 * The video itself is only attached once the page is up, only plays while it
 * is on screen, and is not attached at all when the visitor prefers reduced
 * motion or has asked their browser to save data: they get the still frame,
 * which carries the same picture.
 *
 *   film     the desktop cut
 *   mobile   an optional shorter, portrait cut for phones (the hero has one)
 *   label    what the film shows, for a screen reader; omit for a decorative one
 */
interface FilmProps {
  film: FilmSources;
  mobile?: FilmSources;
  label?: string;
  /** CSS object-position for the poster and the film. */
  position?: string;
  /** Load the poster at high priority: for a film at the top of the page. */
  priority?: boolean;
  sizes?: string;
  className?: string;
}

const PHONE = '(max-width: 767px)';

export function Film({ film, mobile, label, position, priority = false, sizes = '100vw', className }: FilmProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduced || connection?.saveData) return;

    const source = mobile && window.matchMedia(PHONE).matches ? mobile : film;
    // VP9 in WebM is roughly half the bytes of the mp4; use it wherever it plays.
    video.src = video.canPlayType('video/webm; codecs="vp9"') ? source.webm : source.mp4;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void video.play().catch(() => undefined);
        else video.pause();
      },
      { rootMargin: '200px' },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [film, mobile]);

  const style = position ? { objectPosition: position } : undefined;

  return (
    <div className={`film ${className ?? ''}`}>
      <Image
        src={film.poster}
        alt=""
        fill
        sizes={sizes}
        priority={priority}
        className={`photo film-poster ${mobile ? 'film-poster-wide' : ''}`}
        style={style}
      />
      {mobile ? (
        <Image
          src={mobile.poster}
          alt=""
          fill
          sizes={sizes}
          className="photo film-poster film-poster-narrow"
          style={style}
        />
      ) : null}
      <video
        ref={ref}
        className={`photo film-video ${playing ? 'is-playing' : ''}`}
        style={style}
        muted
        loop
        playsInline
        preload="none"
        aria-label={label}
        aria-hidden={label ? undefined : true}
        onPlaying={() => setPlaying(true)}
      />
    </div>
  );
}
