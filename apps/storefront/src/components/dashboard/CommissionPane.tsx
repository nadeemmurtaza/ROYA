'use client';

import { Image } from '@/components/Image';
import { useFormatter, useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/checkout/Field';
import { Link } from '@/i18n/navigation';
import { apiAuthed } from '@/lib/api';
import {
  COMMISSION_STAGES,
  latestEvent,
  openCommissions,
  stageState,
  toInstant,
  upcomingAppointments,
} from '@/lib/commission-model';
import { useAuthedQuery } from '@/lib/use-authed-query';
import type { AppointmentKind, Commission } from '@/types/api';

const KINDS: readonly AppointmentKind[] = ['ATELIER', 'HOME', 'VIDEO'];

/** Shown while the commissions load, and when they could not be had. */
function State({ status, onRetry }: { status: 'loading' | 'error'; onRetry: () => void }) {
  const t = useTranslations('dashboard');
  return status === 'loading' ? (
    <p className="bag-muted" role="status">
      {t('loading')}
    </p>
  ) : (
    <div className="stack u-gap-12 u-items-start">
      <p className="field-error" role="alert">
        {t('loadFailed')}
      </p>
      <button type="button" className="btn-line" onClick={onRetry}>
        {t('retry')}
      </button>
    </div>
  );
}

/**
 * The private client's commissions: for each gown, the atelier's five stages,
 * what it said at each (a note, a photograph or a film) and the date it
 * promised. Everything shown is what the atelier recorded.
 */
export function CommissionPane() {
  const t = useTranslations('dashboard');
  const commissions = useAuthedQuery<Commission[]>('/commissions/mine');

  if (commissions.state.status !== 'ready') {
    return <State status={commissions.state.status} onRetry={commissions.reload} />;
  }
  if (commissions.state.data.length === 0) {
    return (
      <div className="card-box u-items-start">
        <span className="serif u-fs-26">{t('commissionNone')}</span>
        <span className="bag-muted u-max-w-560">{t('commissionNoneBody')}</span>
        <Link className="btn-gold" href={{ pathname: '/consultation', query: { kind: 'atelier' } }}>
          {t('commissionNoneCta')}
        </Link>
      </div>
    );
  }
  return (
    <div className="stack u-gap-28">
      {commissions.state.data.map((commission) => (
        <CommissionTrack key={commission.id} commission={commission} />
      ))}
    </div>
  );
}

function CommissionTrack({ commission }: { commission: Commission }) {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const finished = commission.completedAt !== null;

  return (
    <section className="commission-track" aria-label={commission.title}>
      <header className="stack u-gap-8">
        <span className="eyebrow">{t('commissionOrder', { number: commission.orderNumber })}</span>
        <h2 className="serif u-fs-30">{commission.title}</h2>
        <p className="bag-muted">
          {finished
            ? t('commissionFinished')
            : commission.promisedAt
              ? t('commissionPromised', {
                  date: format.dateTime(new Date(commission.promisedAt), { dateStyle: 'long' }),
                })
              : t('commissionNoDate')}
        </p>
      </header>

      <ol className="track">
        {COMMISSION_STAGES.map((stage) => {
          const state = stageState(stage, commission.stage, finished);
          const event = latestEvent(commission.events, stage);
          return (
            <li
              key={stage}
              className="track-step"
              data-state={state}
              aria-current={state === 'now' ? 'step' : undefined}
            >
              <span className="track-mark" aria-hidden="true" />
              <span className="serif track-name">{t(`stage_${stage}`)}</span>
              <span className="track-state">{t(`stageState_${state}`)}</span>
              {event ? (
                <>
                  <span className="bag-muted-sm">
                    {format.dateTime(new Date(event.createdAt), { dateStyle: 'medium' })}
                  </span>
                  {event.note ? <span className="track-note">{event.note}</span> : null}
                  {event.mediaUrl && event.mediaKind === 'image' ? (
                    <span className="ph track-media">
                      <Image
                        src={event.mediaUrl}
                        alt={t('stageMediaAlt', { stage: t(`stage_${stage}`) })}
                        fill
                        sizes="(max-width: 700px) 100vw, 240px"
                        className="photo"
                      />
                    </span>
                  ) : null}
                  {event.mediaUrl && event.mediaKind === 'video' ? (
                    <a className="lnk" href={event.mediaUrl} rel="noopener" target="_blank">
                      {t('stageFilm')}
                    </a>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** One line for the account's overview: how far each open gown has come, and where to see the rest. */
export function CommissionSummary() {
  const t = useTranslations('dashboard');
  const commissions = useAuthedQuery<Commission[]>('/commissions/mine');
  if (commissions.state.status !== 'ready') return null;
  const open = openCommissions(commissions.state.data);
  if (open.length === 0) return null;

  return (
    <section className="card-box" aria-label={t('commissionSummary')}>
      <span className="eyebrow">{t('commissionSummary')}</span>
      {open.map((commission) => (
        <div key={commission.id} className="stack u-gap-6">
          <span className="serif u-fs-28">{commission.title}</span>
          <span className="bag-muted">
            {t('commissionAt', {
              stage: t(`stage_${commission.stage}`),
              step: COMMISSION_STAGES.indexOf(commission.stage) + 1,
              total: COMMISSION_STAGES.length,
            })}
          </span>
        </div>
      ))}
      <Link className="btn-line u-mt-auto u-self-start" href={{ pathname: '/dashboard', query: { tab: 'commission' } }}>
        {t('commissionOpen')}
      </Link>
    </section>
  );
}

/**
 * Fittings. With a commission under way the client sees the ones arranged and
 * can ask for another; the atelier confirms the time. Without one, the way in
 * is the consultation request.
 */
export function FittingsPane() {
  const t = useTranslations('dashboard');
  const commissions = useAuthedQuery<Commission[]>('/commissions/mine');

  if (commissions.state.status !== 'ready') {
    return <State status={commissions.state.status} onRetry={commissions.reload} />;
  }
  const open = openCommissions(commissions.state.data);

  return (
    <div className="stack u-gap-28">
      <div className="card-box u-items-start">
        <span className="bag-muted u-max-w-560">{t('fittingsBody')}</span>
        <Link className="btn-gold" href={{ pathname: '/consultation', query: { kind: 'atelier' } }}>
          {t('fittingsCta')}
        </Link>
      </div>
      {open.map((commission) => (
        <FittingsFor key={commission.id} commission={commission} onAsked={commissions.reload} />
      ))}
    </div>
  );
}

function FittingsFor({ commission, onAsked }: { commission: Commission; onAsked: () => void }) {
  const t = useTranslations('dashboard');
  const format = useFormatter();
  const ahead = upcomingAppointments(commission.appointments);
  const [kind, setKind] = useState<AppointmentKind>('ATELIER');
  const [when, setWhen] = useState('');
  const [note, setNote] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'error'>('idle');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const startsAt = toInstant(when);
    if (!startsAt) return;
    setState('sending');
    try {
      await apiAuthed(`/commissions/${encodeURIComponent(commission.id)}/appointments`, {
        method: 'POST',
        body: { kind, startsAt, ...(note.trim() ? { note: note.trim() } : {}) },
      });
      setWhen('');
      setNote('');
      setState('idle');
      onAsked();
    } catch {
      setState('error');
    }
  }

  return (
    <section className="card-box" aria-label={commission.title}>
      <span className="eyebrow">{commission.title}</span>
      {ahead.length === 0 ? (
        <span className="bag-muted">{t('fittingsNone')}</span>
      ) : (
        <ul className="fitting-list">
          {ahead.map((appointment) => (
            <li key={appointment.id}>
              <span className="serif u-fs-22">{t(`apptKind_${appointment.kind}`)}</span>
              <bdi>
                {format.dateTime(new Date(appointment.startsAt), { dateStyle: 'medium', timeStyle: 'short' })}
              </bdi>
              <span className="track-state">{t(`apptStatus_${appointment.status}`)}</span>
            </li>
          ))}
        </ul>
      )}

      <form className="stack u-gap-14" onSubmit={submit}>
        <span className="lbl">{t('apptAsk')}</span>
        <div className="f">
          <label className="lbl" htmlFor={`kind-${commission.id}`}>
            {t('apptKindLabel')}
          </label>
          <select
            id={`kind-${commission.id}`}
            className="field"
            value={kind}
            onChange={(event) => setKind(event.target.value as AppointmentKind)}
          >
            {KINDS.map((value) => (
              <option key={value} value={value}>
                {t(`apptKind_${value}`)}
              </option>
            ))}
          </select>
        </div>
        <Field label={t('apptWhen')} id={`when-${commission.id}`}>
          <input
            id={`when-${commission.id}`}
            className="field"
            type="datetime-local"
            value={when}
            onChange={(event) => setWhen(event.target.value)}
            dir="ltr"
            required
          />
        </Field>
        <Field label={t('apptNote')} id={`note-${commission.id}`}>
          <input
            id={`note-${commission.id}`}
            className="field"
            value={note}
            maxLength={500}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {state === 'error' ? (
          <p role="alert" className="field-error">
            {t('apptFailed')}
          </p>
        ) : null}
        <button type="submit" className="btn-gold u-self-start" disabled={state === 'sending' || !toInstant(when)}>
          {state === 'sending' ? t('apptSending') : t('apptSend')}
        </button>
      </form>
    </section>
  );
}
