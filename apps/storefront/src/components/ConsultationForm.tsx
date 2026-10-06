'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { BRAND } from '@newax/shared';
import { Field } from '@/components/checkout/Field';
import { Link } from '@/i18n/navigation';
import { api, apiAuthed } from '@/lib/api';
import { isFilled, whatsappUrl } from '@/lib/brand-contact';
import { EMIRATES, OUTSIDE } from '@/lib/checkout-model';
import {
  KINDS,
  TIMES,
  isKind,
  leadFrom,
  validateConsultation,
  type ConsultationForm as Form,
  type ConsultationProblem,
  type Kind,
} from '@/lib/consultation-model';
import { useSession } from '@/providers/session';
import type { AuthUser } from '@/types/api';

/**
 * A consultation request: which kind, who you are, when suits you. It lands in
 * the atelier's CRM as a lead, and the designer replies personally. No account
 * is needed, but a signed-in client's details are filled in.
 */
export function ConsultationForm() {
  const t = useTranslations('consultation');
  const checkout = useTranslations('checkout');
  const params = useSearchParams();
  const session = useSession();
  const requested = params.get('kind');
  const [form, setForm] = useState<Form>({
    kind: isKind(requested) ? requested : 'atelier',
    name: '',
    email: '',
    phone: '',
    date: '',
    time: 'any',
    where: '',
    message: '',
    orderNumber: (params.get('order') ?? '').slice(0, 30),
  });
  const [problems, setProblems] = useState<ConsultationProblem[]>([]);
  const [trap, setTrap] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');

  useEffect(() => {
    if (session.status !== 'signed-in') return;
    let live = true;
    apiAuthed<AuthUser>('/auth/me')
      .then((me) => {
        if (!live) return;
        setForm((current) => ({
          ...current,
          name: current.name || [me.firstName, me.lastName].filter(Boolean).join(' '),
          email: current.email || me.email || '',
          phone: current.phone || me.phone || '',
        }));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [session.status]);

  const set = (field: keyof Form, value: string) => setForm((current) => ({ ...current, [field]: value }) as Form);
  const error = (problem: ConsultationProblem): string | undefined =>
    problems.includes(problem)
      ? t(problem === 'name' ? 'errName' : problem === 'reach' ? 'errReach' : problem === 'email' ? 'errEmail' : 'errPhone')
      : undefined;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateConsultation(form);
    setProblems(found);
    if (found.length > 0) return;
    // A bot fills every field; a person never sees this one. Pretend it worked.
    if (trap) return setState('done');
    setState('sending');
    try {
      await api('/crm/enquiries', { method: 'POST', body: leadFrom(form), expect: 'none' });
      setState('done');
    } catch {
      setState('failed');
    }
  }

  if (state === 'done') {
    return (
      <div className="consult-page">
        <div className="consult-done fade" role="status">
          <h1 className="serif">{t('doneTitle')}</h1>
          <p>{t('doneBody')}</p>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <a className="btn-gold" href={whatsappUrl} rel="noopener" target="_blank">
              {t('doneWhatsapp')}
            </a>
            <Link className="btn-line" href="/">
              {t('doneHome')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const note: Record<Kind, string> = {
    atelier: t('kindAtelierNote') + (isFilled(BRAND.contact.address) ? ` ${t('atelierAddress', { address: BRAND.contact.address })}` : ''),
    home: t('kindHomeNote'),
    video: t('kindVideoNote'),
  };

  return (
    <div className="consult-page">
      <div className="consult-card fade">
        <Link href="/" className="back">
          {t('back')}
        </Link>
        <span className="eyebrow">{t('eyebrow')}</span>
        <h1 className="serif">{t.rich('title', { em: (chunks) => <em>{chunks}</em> })}</h1>
        <p className="bag-muted">{t('lede')}</p>

        <form className="auth-form" onSubmit={submit} noValidate>
          <div role="radiogroup" aria-label={t('kindAria')} className="kinds">
            {KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={form.kind === kind}
                className={`opt-card${form.kind === kind ? ' opt-card-on' : ''}`}
                onClick={() => set('kind', kind)}
              >
                <span className="serif">{t(`kind_${kind}`)}</span>
              </button>
            ))}
          </div>
          <p className="bag-muted" aria-live="polite">
            {note[form.kind]}
          </p>

          <div className="field-grid">
            <Field id="c-name" label={t('name')} error={error('name')}>
              <input id="c-name" className="field" autoComplete="name" value={form.name} onChange={(event) => set('name', event.target.value)} aria-invalid={error('name') ? true : undefined} aria-describedby="c-name-error" />
            </Field>
            <Field id="c-phone" label={t('phone')} error={error('phone') ?? error('reach')}>
              <input id="c-phone" className="field" type="tel" autoComplete="tel" dir="ltr" value={form.phone} onChange={(event) => set('phone', event.target.value)} aria-invalid={error('phone') || error('reach') ? true : undefined} aria-describedby="c-phone-error" />
            </Field>
            <Field id="c-email" label={t('email')} error={error('email')}>
              <input id="c-email" className="field" type="email" autoComplete="email" dir="ltr" value={form.email} onChange={(event) => set('email', event.target.value)} aria-invalid={error('email') ? true : undefined} aria-describedby="c-email-error" />
            </Field>
            {form.kind === 'home' ? (
              <Field id="c-where" label={t('where')}>
                <select id="c-where" className="field" value={form.where} onChange={(event) => set('where', event.target.value)}>
                  <option value="" />
                  {EMIRATES.map((emirate) => (
                    <option key={emirate} value={emirate}>
                      {emirate}
                    </option>
                  ))}
                  <option value={OUTSIDE}>{checkout('outside')}</option>
                </select>
              </Field>
            ) : null}
            <Field id="c-date" label={t('date')}>
              <input id="c-date" className="field" type="date" value={form.date} min={new Date().toISOString().slice(0, 10)} onChange={(event) => set('date', event.target.value)} />
            </Field>
            <Field id="c-time" label={t('time')}>
              <select id="c-time" className="field" value={form.time} onChange={(event) => set('time', event.target.value)}>
                {TIMES.map((time) => (
                  <option key={time} value={time}>
                    {t(time === 'any' ? 'timeAny' : time === 'morning' ? 'timeMorning' : time === 'afternoon' ? 'timeAfternoon' : 'timeEvening')}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="c-message" label={t('message')} wide>
              <textarea id="c-message" className="field remarks" rows={3} maxLength={1000} placeholder={t('messagePlaceholder')} value={form.message} onChange={(event) => set('message', event.target.value)} />
            </Field>
          </div>

          {form.orderNumber ? <p className="bag-muted-sm">{t('order', { number: form.orderNumber })}</p> : null}

          {/* Honeypot: hidden from people and from assistive technology. */}
          <div aria-hidden="true" className="trap">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={trap} onChange={(event) => setTrap(event.target.value)} />
            </label>
          </div>

          {state === 'failed' ? (
            <p role="alert" className="field-error">
              {t('failed')}
            </p>
          ) : null}
          <button type="submit" className="btn-gold" disabled={state === 'sending'}>
            {state === 'sending' ? t('sending') : t('send')}
          </button>
        </form>
      </div>
    </div>
  );
}
