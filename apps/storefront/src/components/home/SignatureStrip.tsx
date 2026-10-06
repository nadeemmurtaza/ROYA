'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import type { PieceCard } from '@/lib/product-model';
import { Price } from '@/providers/currency';
import { ChevronLeft, ChevronRight, PauseIcon, PlayIcon } from '../icons';

const ADVANCE_MS = 5200;

/** An offset from the active slide, folded so the strip wraps the short way round: -3..2 for six slides. */
function wrap(distance: number, count: number): number {
  const half = Math.floor(count / 2);
  return ((((distance + half) % count) + count) % count) - half;
}

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
              className="photo"
              style={{ opacity: index === active ? 1 : 0 }}
            />
          ) : null,
        )}
      </div>
      <div className="band-shade" aria-hidden="true" />

      <div className="band-head">
        <div className="stack" style={{ gap: 14 }}>
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
          const offset = wrap(index - active, count);
          const was = wrap(index - previous, count);
          const on = offset === 0;
          return (
            <button
              key={piece.slug}
              type="button"
              className={on ? 'scard scard-on' : 'scard'}
              aria-label={piece.name}
              aria-current={on ? 'true' : undefined}
              onClick={() => go(index)}
              style={{
                transform: `translateX(calc(var(--dir, 1) * ${offset} * var(--step))) scale(${on ? 1.22 : 1})`,
                opacity: Math.abs(offset) > 2 ? 0 : 1,
                zIndex: 10 - Math.abs(offset),
                // A card that wraps round the back jumps instead of sweeping across the front.
                transitionDuration: Math.abs(offset - was) > 1 ? '0s' : '1.4s',
              }}
            >
              {piece.cover ? <Image src={piece.cover.url} alt="" fill sizes="210px" className="photo" /> : null}
            </button>
          );
        })}
      </div>

      <div className="band-current">
        <div className="swap stack" key={current.slug} style={{ alignItems: 'center', gap: 10 }}>
          <span className="label">{current.tag}</span>
          <span className="serif name">{current.name}</span>
          <span className="meta">
            {current.blurb} · <Price minor={current.price} prefix={current.isFrom ? common('from') : undefined} />
          </span>
        </div>
        <Link className="btn-line" href={`/product/${current.slug}`} style={{ marginTop: 18 }}>
          {t('viewPiece')}
        </Link>
      </div>
    </section>
  );
}
