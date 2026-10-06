'use client';

import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

/**
 * The private list: an email, kept as a lead in the atelier's CRM, tagged with
 * where it came from. The API requires a name on a lead; a list signup has
 * none, so the address stands in for it until the client says otherwise.
 */
export function PrivateListForm() {
  const t = useTranslations('footer');
  const common = useTranslations('common');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setState('sending');
    try {
      await api('/crm/enquiries', {
        method: 'POST',
        body: { name: email.trim(), email: email.trim(), source: 'private-list' },
        expect: 'none',
      });
      setState('done');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : common('somethingWrong'));
      setState('error');
    }
  }

  if (state === 'done')
    return (
      <p role="status" className="footer-thanks">
        {t('joined')}
      </p>
    );

  return (
    <form className="private-list-form" onSubmit={submit} noValidate>
      <div className="private-list">
        <input
          id="private-list"
          className="field"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder={t('email')}
          aria-label={t('email')}
          aria-invalid={state === 'error'}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className="btn-line" disabled={state === 'sending' || email.trim() === ''}>
          {t('join')}
        </button>
      </div>
      {state === 'error' ? (
        <p role="alert" className="field-error">
          {message}
        </p>
      ) : null}
    </form>
  );
}
