'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { BRAND } from '@newax/shared';
import { Link } from '@/i18n/navigation';
import { image } from '@/lib/media';

const ADVANCE_MS = 5000;

const SHOTS = [
  { name: 'mehr-portrait', key: 'shotBride', position: '50% 22%' },
  { name: 'lilas-blossom', key: 'shotPearls', position: '50% 50%' },
  { name: 'noir-corset-inside', key: 'shotCorset', position: '40% 50%' },
  { name: 'lilas-in-box', key: 'shotLabel', position: '50% 40%' },
] as const;

const STEPS = [1, 2, 3, 4] as const;

/**
 * The Commission: four steps, each with its own photograph crossfading inside a
 * shape that slowly changes outline. The steps advance on their own until the
 * visitor picks one (or prefers reduced motion), after which they hold still.
 */
export function CommissionPortal() {
  const t = useTranslations('home');
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(false);
  }, []);

  useEffect(() => {
    if (!auto) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % STEPS.length), ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [auto]);

  return (
    <section id="commission" aria-label={t('commissionAria')} className="commission">
      <div className="commission-inner">
        <div className="portal-col">
          <div className="portal">
            <div className="morph-fill" aria-hidden="true" />
            <div className="morph">
              {SHOTS.map((shot, index) => (
                <Image
                  key={shot.name}
                  src={image(shot.name)}
                  alt={t(shot.key)}
                  fill
                  sizes="(max-width: 700px) 90vw, 480px"
                  className="photo mimg"
                  style={{
                    opacity: index === active ? 1 : 0,
                    transform: `scale(${index === active ? 1.06 : 1.14})`,
                    objectPosition: shot.position,
                  }}
                />
              ))}
            </div>
            <div className="morph-line" aria-hidden="true" />
          </div>
        </div>

        <div className="commission-copy">
          <div className="reveal stack" style={{ gap: 16 }}>
            <span className="eyebrow">{t('commissionEyebrow')}</span>
            <h2 className="serif commission-title">{t('commissionTitle')}</h2>
            <p className="commission-lede">{t('commissionBody')}</p>
          </div>

          <ol className="steps">
            {STEPS.map((step, index) => {
              const on = index === active;
              return (
                <li key={step}>
                  <button
                    type="button"
                    className={`step${on ? ' step-on' : ''}${on && auto ? ' is-timed' : ''}`}
                    aria-current={on ? 'step' : undefined}
                    onClick={() => {
                      setActive(index);
                      setAuto(false);
                    }}
                  >
                    <span className="serif num">{t(`step${step}Num`)}</span>
                    <span>
                      <strong>{t(`step${step}Title`)}</strong>
                      <span className="body">{t(`step${step}Body`)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="btn-row" style={{ alignItems: 'center' }}>
            <Link className="btn-ink" href="/consultation">
              {t('commissionCta')}
            </Link>
            <span className="commission-note">{t('commissionNote', { percent: BRAND.commerce.bespokeDepositPercent })}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
