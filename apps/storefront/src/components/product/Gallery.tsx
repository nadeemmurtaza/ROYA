'use client';

import { Image } from '@/components/Image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Film } from '@/components/Film';
import { PlayIcon } from '@/components/icons';
import type { GalleryItem } from '@/lib/product-model';

/**
 * The product gallery: photographs first, then the atelier films, a column of
 * thumbnails beside one large frame (below it on a phone). A film plays muted
 * and on a loop in the frame; "Watch the film" jumps to the first one.
 */
export function Gallery({ items }: { items: GalleryItem[] }) {
  const t = useTranslations('product');
  const [view, setView] = useState(0);
  const current = items[view] ?? items[0];
  const firstFilm = items.findIndex((item) => item.kind === 'film');

  if (!current) return <div className="ph gallery-frame" />;

  return (
    <div className="gal">
      {items.length > 1 ? (
        <div role="group" aria-label={t('gallery')} className="gal-thumbs">
          {items.map((item, index) => (
            <button
              key={item.url}
              type="button"
              className={`thumb ph${index === view ? ' thumb-on' : ''}`}
              aria-label={t('viewImage', { label: item.alt })}
              aria-pressed={index === view}
              onClick={() => setView(index)}
            >
              <Image
                src={item.kind === 'film' ? item.film.poster : item.url}
                alt=""
                fill
                sizes="84px"
                className="photo"
              />
              {item.kind === 'film' ? (
                <span className="thumb-play" aria-hidden="true">
                  <PlayIcon size={16} />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="gal-main">
        <div className="ph swap gallery-frame" key={current.url} data-keep="dark">
          {current.kind === 'film' ? (
            <Film film={current.film} label={current.alt} sizes="(max-width: 900px) 100vw, 55vw" />
          ) : (
            <Image
              src={current.url}
              alt={current.alt}
              fill
              priority={view === 0}
              sizes="(max-width: 900px) 100vw, 55vw"
              className="photo u-focus-30"
            />
          )}
        </div>
        {firstFilm >= 0 && current.kind !== 'film' ? (
          <button type="button" className="film-chip" onClick={() => setView(firstFilm)}>
            <PlayIcon size={14} />
            {t('watchFilm')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
