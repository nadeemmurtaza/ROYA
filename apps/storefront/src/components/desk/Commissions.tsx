'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/checkout/Field';
import { apiAuthed } from '@/lib/api';
import { nextStage, previousStage } from '@/lib/commission-model';
import { useAuthedQuery } from '@/lib/use-authed-query';
import type { Commission, CommissionAppointment, CommissionStage } from '@/types/api';
import { useDesk } from './DeskShell';
import { LoadState, useFailure, useStamp } from './parts';

/** A commission with the ids the atelier needs; the client's own read leaves them out. */
type DeskCommission = Commission & { orderId: string };

/**
 * Gowns being made: every open commission, the one move it can take next, and
 * the fittings the client has asked for. What the client reads on their account
 * is what is recorded here, so a note typed here is a note the client will see.
 */
export function Commissions() {
  const t = useTranslations('desk');
  const { state, reload, setData } = useAuthedQuery<DeskCommission[]>('/admin/commissions', { open: 'true' });

  return (
    <>
      <div className="desk-head">
        <h1 className="serif desk-title">{t('commissionsTitle')}</h1>
        <p className="bag-muted">{t('commissionsLead')}</p>
      </div>

      <OpenForm onOpened={reload} />

      {state.status !== 'ready' ? (
        <LoadState status={state.status} onRetry={reload} />
      ) : state.data.length === 0 ? (
        <div className="desk-card">
          <span className="serif desk-empty">{t('noCommissions')}</span>
        </div>
      ) : (
        <ul className="desk-cards">
          {state.data.map((commission) => (
            <CommissionCard
              key={commission.id}
              commission={commission}
              onChanged={(next) =>
                // A finished commission leaves the open list.
                setData(
                  state.data.flatMap((row) =>
                    row.id !== next.id ? [row] : next.completedAt ? [] : [{ ...row, ...next }],
                  ),
                )
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

/** Starting the track for an order: its number, and what the gown is called. */
function OpenForm({ onOpened }: { onOpened: () => void }) {
  const t = useTranslations('desk');
  const fail = useFailure();
  const [number, setNumber] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await apiAuthed('/admin/commissions', {
        method: 'POST',
        body: { orderNumber: number.trim(), title: title.trim() },
      });
      setNumber('');
      setTitle('');
      onOpened();
    } catch (failure) {
      setError(fail(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="desk-card">
      <summary className="eyebrow">{t('commissionOpen')}</summary>
      <form className="desk-form" onSubmit={submit}>
        <Field id="commission-order" label={t('commissionOrderNumber')}>
          <input
            id="commission-order"
            className="field"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            dir="ltr"
            required
          />
        </Field>
        <Field id="commission-title" label={t('commissionName')}>
          <input
            id="commission-title"
            className="field"
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>
        {error ? (
          <p role="alert" className="field-error">
            {error}
          </p>
        ) : null}
        <button type="submit" className="btn-gold u-self-start" disabled={busy || !number.trim() || !title.trim()}>
          {t('commissionOpenCta')}
        </button>
      </form>
    </details>
  );
}

function CommissionCard({
  commission,
  onChanged,
}: {
  commission: DeskCommission;
  onChanged: (commission: DeskCommission) => void;
}) {
  const t = useTranslations('desk');
  const fail = useFailure();
  const stamp = useStamp();
  const { refresh } = useDesk();
  const forward = nextStage(commission.stage);
  const back = previousStage(commission.stage);
  const [moving, setMoving] = useState<CommissionStage | null>(null);
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function act(run: () => Promise<DeskCommission>) {
    setBusy(true);
    setError('');
    try {
      const updated = await run();
      setMoving(null);
      setNote('');
      setPhoto(null);
      refresh();
      onChanged({ ...commission, ...updated });
    } catch (failure) {
      setError(fail(failure));
    } finally {
      setBusy(false);
    }
  }

  function move(event: FormEvent) {
    event.preventDefault();
    if (!moving) return;
    const form = new FormData();
    form.append('stage', moving);
    if (note.trim()) form.append('note', note.trim());
    if (photo) form.append('photo', photo);
    void act(() =>
      apiAuthed<DeskCommission>(`/admin/commissions/${encodeURIComponent(commission.id)}/stage`, {
        method: 'POST',
        formData: form,
      }),
    );
  }

  async function setAppointment(appointment: CommissionAppointment, status: CommissionAppointment['status']) {
    await act(async () => {
      await apiAuthed(`/admin/commissions/appointments/${encodeURIComponent(appointment.id)}`, {
        method: 'PATCH',
        body: { status },
      });
      return {
        ...commission,
        appointments: commission.appointments.map((row) => (row.id === appointment.id ? { ...row, status } : row)),
      };
    });
  }

  const asked = commission.appointments.filter((a) => a.status === 'REQUESTED' || a.status === 'CONFIRMED');

  return (
    <li className="desk-card">
      <div className="desk-state-line">
        <span className="serif desk-name">{commission.title}</span>
        <span className="desk-pill">{t(`stage_${commission.stage}`)}</span>
      </div>
      <p className="bag-muted-sm">
        <bdi dir="ltr">{commission.orderNumber}</bdi> ·{' '}
        {t('commissionMoved', { date: stamp(commission.events.at(-1)?.createdAt ?? commission.createdAt) })}
      </p>

      {asked.length > 0 ? (
        <ul className="fitting-list">
          {asked.map((appointment) => (
            <li key={appointment.id}>
              <span className="serif u-fs-22">{t(`apptKind_${appointment.kind}`)}</span>
              <bdi>{stamp(appointment.startsAt)}</bdi>
              <span className="desk-actions">
                {appointment.status === 'REQUESTED' ? (
                  <button
                    type="button"
                    className="btn-line desk-small"
                    disabled={busy}
                    onClick={() => void setAppointment(appointment, 'CONFIRMED')}
                  >
                    {t('apptConfirm')}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-line desk-small"
                    disabled={busy}
                    onClick={() => void setAppointment(appointment, 'DONE')}
                  >
                    {t('apptDone')}
                  </button>
                )}
                <button
                  type="button"
                  className="desk-quiet"
                  disabled={busy}
                  onClick={() => void setAppointment(appointment, 'CANCELLED')}
                >
                  {t('apptCancel')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {moving ? (
        <form className="desk-confirm" onSubmit={move}>
          <p>{t('commissionMoveTo', { stage: t(`stage_${moving}`) })}</p>
          <Field id={`note-${commission.id}`} label={moving === back ? t('commissionWhyBack') : t('commissionNote')}>
            <textarea
              id={`note-${commission.id}`}
              className="field"
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              required={moving === back}
            />
          </Field>
          <Field id={`photo-${commission.id}`} label={t('commissionPhoto')}>
            <input
              id={`photo-${commission.id}`}
              type="file"
              accept="image/*"
              onChange={(event) => setPhoto(event.target.files?.[0] ?? null)}
            />
          </Field>
          <div className="desk-actions">
            <button type="submit" className="btn-gold" disabled={busy || (moving === back && !note.trim())}>
              {t('commissionConfirmMove')}
            </button>
            <button type="button" className="btn-line" disabled={busy} onClick={() => setMoving(null)}>
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className="desk-actions">
          {forward ? (
            <button type="button" className="btn-gold" disabled={busy} onClick={() => setMoving(forward)}>
              {t('commissionAdvance', { stage: t(`stage_${forward}`) })}
            </button>
          ) : (
            <button
              type="button"
              className="btn-gold"
              disabled={busy}
              onClick={() =>
                void act(() =>
                  apiAuthed<DeskCommission>(`/admin/commissions/${encodeURIComponent(commission.id)}/complete`, {
                    method: 'POST',
                    body: {},
                  }),
                )
              }
            >
              {t('commissionComplete')}
            </button>
          )}
          {back ? (
            <button type="button" className="desk-quiet" disabled={busy} onClick={() => setMoving(back)}>
              {t('commissionSendBack', { stage: t(`stage_${back}`) })}
            </button>
          ) : null}
        </div>
      )}

      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}
    </li>
  );
}
