'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { LEAD_STATUSES } from '@newax/shared';
import { Field } from '@/components/checkout/Field';
import { apiAuthed } from '@/lib/api';
import { parseLeadMessage } from '@/lib/consultation-model';
import { mailLink, phoneLink, whatsappLink } from '@/lib/desk-model';
import { useAuthedQuery } from '@/lib/use-authed-query';
import type { Lead } from '@/types/api';
import { useDesk } from './DeskShell';
import { LoadState, useFailure, useStamp } from './parts';

type Filter = Lead['status'] | 'ALL';

/**
 * What came in through the site: consultation requests and enquiries, each with
 * the client's way of being reached and a status the atelier moves along as it
 * follows up.
 */
export function Requests() {
  const t = useTranslations('desk');
  const [filter, setFilter] = useState<Filter>('NEW');
  const { state, reload, setData } = useAuthedQuery<Lead[]>('/admin/crm/leads', {
    status: filter === 'ALL' ? '' : filter,
  });

  return (
    <>
      <div className="desk-head">
        <h1 className="serif desk-title">{t('requestsTitle')}</h1>
        <p className="bag-muted">{t('requestsLead')}</p>
      </div>

      <div className="desk-chips" role="group" aria-label={t('leadFilterAria')}>
        {([...LEAD_STATUSES, 'ALL'] as const).map((value) => (
          <button
            key={value}
            type="button"
            className={`desk-chip${value === filter ? ' desk-chip-on' : ''}`}
            aria-pressed={value === filter}
            onClick={() => setFilter(value)}
          >
            {value === 'ALL' ? t('leadAll') : t(`leadStatus_${value}`)}
          </button>
        ))}
      </div>

      {state.status !== 'ready' ? (
        <LoadState status={state.status} onRetry={reload} />
      ) : state.data.length === 0 ? (
        <div className="desk-card">
          <span className="serif desk-empty">{t('noRequests')}</span>
        </div>
      ) : (
        <ul className="desk-cards">
          {state.data.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onChanged={(next) =>
                // Under a status filter, a request that has moved on leaves the list.
                setData(
                  filter === 'ALL'
                    ? state.data.map((row) => (row.id === next.id ? { ...row, ...next } : row))
                    : state.data.filter((row) => row.id !== next.id || next.status === filter),
                )
              }
            />
          ))}
        </ul>
      )}
    </>
  );
}

function LeadCard({ lead, onChanged }: { lead: Lead; onChanged: (lead: Lead) => void }) {
  const t = useTranslations('desk');
  const fail = useFailure();
  const stamp = useStamp();
  const { refresh } = useDesk();
  const facts = parseLeadMessage(lead.message);
  const [losing, setLosing] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function setStatus(status: Lead['status'], lostReason?: string) {
    setBusy(true);
    setError('');
    try {
      const updated = await apiAuthed<Lead>(`/admin/crm/leads/${encodeURIComponent(lead.id)}`, {
        method: 'PATCH',
        body: { status, ...(lostReason ? { lostReason } : {}) },
      });
      setLosing(false);
      setReason('');
      refresh();
      onChanged({ ...lead, ...updated });
    } catch (failure) {
      setError(fail(failure));
    } finally {
      setBusy(false);
    }
  }

  const contacts = [
    { href: whatsappLink(lead.phone), label: t('viaWhatsApp'), external: true },
    { href: phoneLink(lead.phone), label: t('viaPhone'), external: false },
    { href: mailLink(lead.email), label: t('viaEmail'), external: false },
  ].filter((contact): contact is { href: string; label: string; external: boolean } => contact.href !== null);

  const kind = facts.kind
    ? t(`kind_${facts.kind}`)
    : t.has(`source_${lead.source}`)
      ? t(`source_${lead.source}`)
      : lead.source;

  return (
    <li className="desk-card">
      <div className="desk-state-line">
        <span className="serif desk-name">{lead.name}</span>
      </div>
      <p className="bag-muted-sm">
        {kind} · {t('receivedOn', { date: stamp(lead.createdAt) })}
      </p>

      {facts.preferred || facts.where || facts.orderNumber ? (
        <dl className="desk-notes">
          {facts.preferred ? (
            <div>
              <dt>{t('preferred')}</dt>
              <dd>{facts.preferred}</dd>
            </div>
          ) : null}
          {facts.where ? (
            <div>
              <dt>{t('where')}</dt>
              <dd>{facts.where}</dd>
            </div>
          ) : null}
          {facts.orderNumber ? (
            <div>
              <dt>{t('aboutOrder')}</dt>
              <dd>
                <bdi dir="ltr">{facts.orderNumber}</bdi>
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {facts.text ? <p className="desk-message">{facts.text}</p> : null}
      {lead.status === 'LOST' && lead.lostReason ? (
        <p className="bag-muted-sm">{t('lostBecause', { reason: lead.lostReason })}</p>
      ) : null}

      {contacts.length > 0 ? (
        <div className="desk-actions">
          {contacts.map((contact) => (
            <a
              key={contact.label}
              className="btn-line desk-small"
              href={contact.href}
              {...(contact.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            >
              {contact.label}
            </a>
          ))}
        </div>
      ) : null}

      <div className="desk-set">
        <label className="lbl" htmlFor={`status-${lead.id}`}>
          {t('statusFilter')}
        </label>
        <select
          id={`status-${lead.id}`}
          className="field"
          value={lead.status}
          disabled={busy}
          onChange={(event) => {
            const next = event.target.value as Lead['status'];
            if (next === 'LOST') setLosing(true);
            else void setStatus(next);
          }}
        >
          {LEAD_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`leadStatus_${value}`)}
            </option>
          ))}
        </select>
      </div>

      {losing ? (
        <form
          className="desk-confirm"
          onSubmit={(event: FormEvent) => {
            event.preventDefault();
            void setStatus('LOST', reason.trim() || undefined);
          }}
        >
          <Field id={`lost-${lead.id}`} label={t('lostReason')}>
            <input
              id={`lost-${lead.id}`}
              className="field"
              value={reason}
              maxLength={300}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          <div className="desk-actions">
            <button type="submit" className="btn-gold" disabled={busy}>
              {t('lostConfirm')}
            </button>
            <button type="button" className="btn-line" disabled={busy} onClick={() => setLosing(false)}>
              {t('lostKeep')}
            </button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
