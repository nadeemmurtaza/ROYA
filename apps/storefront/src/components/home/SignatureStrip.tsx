'use client';

import { Image } from '@/components/Image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { PieceCard } from '@/lib/product-model';
import { stripPlace, stripSnaps, wrapOffset } from '@/lib/strip-model';
import { Price } from '@/providers/currency';
import { ChevronLeft, ChevronRight, PauseIcon, PlayIcon } from '../icons';

const ADVANCE_MS = 5200;

/**
 * The signature edit: a strip of pieces where the active one steps forward and
 * its photograph becomes the blurred, monochrome backdrop. It advances on its
 * own, can be paused (WCAG 2.2.2), and starts paused for a visitor who prefers
 * reduced motion.
 */
export function SignatureStrip({ pieces }: { pieces: PieceCard[] }) {
  const t = useTranslations('home');
  const common = useTranslations('common');
  const count = pieces.length;
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true);
  }, []);

  const go = (target: number) => {
    setPrevious(active);
    setActive(((target % count) + count) % count);
  };

  useEffect(() => {
    if (paused || count < 2) return;
    const timer = window.setInterval(() => {
      setActive((current) => {
        setPrevious(current);
        return (current + 1) % count;
      });
    }, ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, count]);

  if (count === 0) return null;
  const current = pieces[active]!;
  const counter = `${String(active + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;

  return (
    <section aria-label={t('signatureAria')} data-keep="dark" className="band">
      <div className="band-bg" aria-hidden="true">
        {pieces.map((piece, index) =>
          piece.cover ? (
            <Image
              key={piece.slug}
              src={piece.cover.url}
              alt=""
              fill
              sizes="100vw"
              className={index === active ? 'photo band-img-on' : 'photo'}
            />
          ) : null,
        )}
      </div>
      <div className="band-shade" aria-hidden="true" />

      <div className="band-head">
        <div className="stack u-gap-14">
          <span className="label">{t('signatureEyebrow')}</span>
          <h2 className="serif band-title">
            {t('signatureTitleA')}
            <br />
            <em>{t('signatureTitleB')}</em>
          </h2>
        </div>
        <div className="band-controls">
          <button
            type="button"
            className="navc"
            aria-label={paused ? t('play') : t('pause')}
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? <PlayIcon size={16} /> : <PauseIcon size={16} />}
          </button>
          <span className="serif band-counter" aria-live="polite" dir="ltr">
            {counter}
          </span>
          <button type="button" className="navc" aria-label={t('prev')} onClick={() => go(active - 1)}>
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="navc" aria-label={t('next')} onClick={() => go(active + 1)}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="band-track">
        {pieces.map((piece, index) => {
          const offset = wrapOffset(index - active, count);
          const was = wrapOffset(index - previous, count);
          const on = offset === 0;
          const place = stripPlace(offset);
          const snap = stripSnaps(offset, was);
          return (
            <button
              key={piece.slug}
              type="button"
              className={`scard${on ? ' scard-on' : ''}${snap ? ' scard-snap' : ''}`}
              data-offset={place}
              aria-label={piece.name}
              aria-current={on ? 'true' : undefined}
              onClick={() => go(index)}
            >
              {piece.cover ? <Image src={piece.cover.url} alt="" fill sizes="210px" className="photo" /> : null}
            </button>
          );
        })}
      </div>

      <div className="band-current">
        <div className="swap stack u-items-center u-gap-10" key={current.slug}>
          <span className="label">{current.tag}</span>
          <span className="serif name">{current.name}</span>
          <span className="meta">
            {current.blurb} · <Price minor={current.price} prefix={current.isFrom ? common('from') : undefined} />
          </span>
        </div>
        <Link className="btn-line u-mt-18" href={`/product/${current.slug}`}>
          {t('viewPiece')}
        </Link>
      </div>
    </section>
  );
}
