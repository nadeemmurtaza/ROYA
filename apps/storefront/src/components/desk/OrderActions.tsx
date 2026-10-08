'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import type { OrderStatus } from '@newax/shared';
import { Field } from '@/components/checkout/Field';
import { apiAuthed } from '@/lib/api';
import { DESK_PERMISSION, forwardStep, sideSteps } from '@/lib/desk-model';
import type { AdminOrder } from '@/types/api';
import { useDesk } from './DeskShell';
import { StatusPill, useFailure } from './parts';

/** The order, once the engine has caught up with a shipment that was just recorded (its status follows within seconds). */
async function untilShipped(id: string): Promise<AdminOrder | null> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const order = await apiAuthed<AdminOrder>(`/admin/orders/${encodeURIComponent(id)}`);
    if (order.status !== 'READY_TO_SHIP') return order;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

/**
 * What to do with the order next: the one step forward, and, quietly behind a
 * confirmation, the ways an order leaves its path (cancelled, returned). The
 * engine decides which moves are allowed; this only offers the ones it will take.
 */
export function OrderActions({
  order,
  paid,
  onChanged,
}: {
  order: AdminOrder;
  /** A payment was received, so cancelling needs a refund recorded too. */
  paid: boolean;
  onChanged: (order: AdminOrder | null, notice?: string) => void;
}) {
  const t = useTranslations('desk');
  const fail = useFailure();
  const { can, refresh } = useDesk();
  const status = order.status as OrderStatus;
  const forward = forwardStep(status);
  const side = sideSteps(status);

  const [leaving, setLeaving] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function move(to: OrderStatus, note?: string) {
    setBusy(true);
    setError('');
    try {
      const updated = await apiAuthed<AdminOrder>(`/admin/orders/${encodeURIComponent(order.id)}/status`, {
        method: 'POST',
        body: { status: to, ...(note ? { note } : {}) },
      });
      setLeaving(null);
      setReason('');
      refresh();
      onChanged(updated);
    } catch (failure) {
      setError(fail(failure));
    } finally {
      setBusy(false);
    }
  }

  const leave = (to: OrderStatus, event: FormEvent) => {
    event.preventDefault();
    void move(to, reason.trim() || undefined);
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="desk-state-line">
        <StatusPill status={order.status} />
        {status === 'CANCELLED' && order.cancelReason ? (
          <span className="bag-muted-sm">{t('cancelledBecause', { reason: order.cancelReason })}</span>
        ) : null}
      </div>

      {forward === 'SHIPPED' && can(DESK_PERMISSION.dispatch) ? (
        <Dispatch order={order} onChanged={onChanged} />
      ) : forward ? (
        <>
          <p className="bag-muted">{t(`nextHint_${status}`)}</p>
          <div className="desk-actions">
            <button
              type="button"
              className={forward === 'CONFIRMED' && !paid ? 'btn-line' : 'btn-gold'}
              disabled={busy}
              onClick={() => void move(forward)}
            >
              {busy && !leaving ? t('moving') : t(`action_${forward}`)}
            </button>
          </div>
        </>
      ) : (
        <p className="bag-muted">{t('nextEnd', { status: t(`status_${status}`) })}</p>
      )}

      {error && !leaving ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {side.length > 0 && !leaving ? (
        <div className="desk-actions">
          {side.map((to) => (
            <button key={to} type="button" className="desk-quiet" onClick={() => setLeaving(to)}>
              {t(`action_${to}`)}
            </button>
          ))}
        </div>
      ) : null}

      {leaving ? (
        <form className="desk-confirm" onSubmit={(event) => leave(leaving, event)}>
          <p role="group">
            <strong>{t(leaving === 'CANCELLED' ? 'cancelTitle' : 'returnTitle')}</strong>
            <br />
            {t(leaving === 'CANCELLED' ? 'cancelBody' : 'returnBody')}
            {paid ? ` ${t('cancelPaid')}` : ''}
          </p>
          <Field id="desk-leave-reason" label={t('cancelReason')}>
            <input
              id="desk-leave-reason"
              className="field"
              value={reason}
              maxLength={300}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          {error ? (
            <p className="field-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="desk-actions">
            <button type="submit" className="btn-gold" disabled={busy}>
              {busy ? t('moving') : t(leaving === 'CANCELLED' ? 'cancelConfirm' : 'returnConfirm')}
            </button>
            <button
              type="button"
              className="btn-line"
              disabled={busy}
              onClick={() => {
                setLeaving(null);
                setError('');
              }}
            >
              {t(leaving === 'CANCELLED' ? 'cancelKeep' : 'returnKeep')}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

/**
 * Handing the piece to a courier: who has it and, if there is one, the
 * tracking number. Recording the shipment is what moves the order to Shipped,
 * and gives the client's tracking page something to show.
 */
function Dispatch({
  order,
  onChanged,
}: {
  order: AdminOrder;
  onChanged: (order: AdminOrder | null, notice?: string) => void;
}) {
  const t = useTranslations('desk');
  const fail = useFailure();
  const { refresh } = useDesk();
  const [courier, setCourier] = useState('');
  const [tracking, setTracking] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // One key per attempt to dispatch, so a double press records one shipment, not two.
  const key = useRef<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    key.current ??= crypto.randomUUID();
    try {
      await apiAuthed('/admin/fulfilment/shipments', {
        method: 'POST',
        headers: { 'Idempotency-Key': key.current },
        body: {
          orderId: order.id,
          ...(courier.trim() ? { courier: courier.trim() } : {}),
          ...(tracking.trim() ? { trackingNumber: tracking.trim() } : {}),
          ...(link.trim() ? { trackingUrl: link.trim() } : {}),
        },
      });
    } catch (failure) {
      setError(fail(failure));
      setBusy(false);
      return;
    }
    // The shipment is recorded; from here on, a failed read must not read as a failed dispatch.
    key.current = null;
    refresh();
    onChanged(await untilShipped(order.id).catch(() => null));
    setBusy(false);
  }

  return (
    <form className="desk-form" onSubmit={submit}>
      <p className="bag-muted">{t('nextHint_READY_TO_SHIP')}</p>
      <Field id="desk-courier" label={t('dispatchCourier')}>
        <input
          id="desk-courier"
          className="field"
          value={courier}
          maxLength={60}
          onChange={(event) => setCourier(event.target.value)}
        />
      </Field>
      <Field id="desk-tracking" label={t('dispatchTracking')}>
        <input
          id="desk-tracking"
          className="field"
          dir="ltr"
          value={tracking}
          maxLength={120}
          onChange={(event) => setTracking(event.target.value)}
        />
      </Field>
      <Field id="desk-link" label={t('dispatchLink')}>
        <input
          id="desk-link"
          className="field"
          dir="ltr"
          type="url"
          value={link}
          maxLength={500}
          onChange={(event) => setLink(event.target.value)}
        />
      </Field>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="desk-actions">
        <button type="submit" className="btn-gold" disabled={busy}>
          {busy ? t('moving') : t('dispatchConfirm')}
        </button>
      </div>
    </form>
  );
}
