'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Field } from '@/components/checkout/Field';
import { Link } from '@/i18n/navigation';
import { api, apiAuthed } from '@/lib/api';
import { useSession } from '@/providers/session';

/**
 * The three pages an email links to, each carrying a one-time token in its
 * address: choose a new password, confirm an email address, stop marketing
 * email. The API checks every token; these only hand it over and say what
 * happened.
 */
function Frame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="token-page">
      <div className="token-card fade">
        <Link href="/" className="logo shine token-logo">
          ROYA
        </Link>
        <h1 className="serif">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function ResetPassword() {
  const t = useTranslations('account');
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 8) return setError(t('errNewPassword'));
    setError('');
    setState('sending');
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, newPassword: password }, expect: 'none' });
      setState('done');
    } catch {
      setState('failed');
    }
  }

  return (
    <Frame title={t('resetTitle')}>
      {!token || state === 'failed' ? (
        <>
          <p role="alert" className="field-error">
            {token ? t('resetFailed') : t('resetNoToken')}
          </p>
          <Link className="btn-gold" href={{ pathname: '/account', query: { mode: 'forgot' } }}>
            {t('resetNewLink')}
          </Link>
          <Link className="navlink u-self-start" href="/account">
            {t('backToSignIn')}
          </Link>
        </>
      ) : state === 'done' ? (
        <>
          <p role="status" className="bag-muted">
            {t('resetDone')}
          </p>
          <Link className="btn-gold" href="/account">
            {t('signIn')}
          </Link>
        </>
      ) : (
        <form className="auth-form" onSubmit={submit} noValidate>
          <p className="bag-muted">{t('resetBody')}</p>
          <Field id="r-password" label={t('resetNew')} error={error}>
            <input
              id="r-password"
              className="field"
              type="password"
              autoComplete="new-password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby="r-password-error"
            />
          </Field>
          <button type="submit" className="btn-gold" disabled={state === 'sending'}>
            {state === 'sending' ? t('working') : t('resetSave')}
          </button>
        </form>
      )}
    </Frame>
  );
}

export function VerifyEmail() {
  const t = useTranslations('account');
  const common = useTranslations('common');
  const session = useSession();
  const token = useSearchParams().get('token');
  const [state, setState] = useState<'working' | 'done' | 'failed'>(token ? 'working' : 'failed');
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  useEffect(() => {
    if (!token) return;
    let live = true;
    api('/auth/verify-email', { method: 'POST', body: { token }, expect: 'none' })
      .then(() => live && setState('done'))
      .catch(() => live && setState('failed'));
    return () => {
      live = false;
    };
  }, [token]);

  async function resendLink() {
    setResend('sending');
    try {
      await apiAuthed('/auth/resend-verification', { method: 'POST', expect: 'none' });
      setResend('sent');
    } catch {
      setResend('failed');
    }
  }

  const title =
    state === 'working' ? t('verifyTitle') : state === 'done' ? t('verifyDoneTitle') : t('verifyFailedTitle');

  return (
    <Frame title={title}>
      {state === 'working' ? (
        <p role="status" className="bag-muted">
          {t('working')}
        </p>
      ) : null}
      {state === 'done' ? (
        <p role="status" className="bag-muted">
          {t('verifyDone')}
        </p>
      ) : null}
      {state === 'failed' ? (
        <>
          <p role="alert" className="field-error">
            {t('verifyFailed')}
          </p>
          {/* An expired link is recoverable: a signed-in client asks for another, anyone else signs in first. */}
          {resend === 'sent' ? (
            <p role="status" className="bag-muted">
              {t('verifyResent')}
            </p>
          ) : session.status === 'signed-in' ? (
            <>
              {resend === 'failed' ? (
                <p role="alert" className="field-error">
                  {common('somethingWrong')}
                </p>
              ) : null}
              <button type="button" className="btn-line" disabled={resend === 'sending'} onClick={resendLink}>
                {resend === 'sending' ? t('working') : t('verifyResend')}
              </button>
            </>
          ) : session.status === 'anonymous' ? (
            <>
              <p className="bag-muted">{t('verifySignIn')}</p>
              <Link className="btn-line" href={{ pathname: '/account', query: { next: '/verify-email' } }}>
                {t('signIn')}
              </Link>
            </>
          ) : null}
        </>
      ) : null}
      {state !== 'working' ? (
        <Link className={state === 'done' ? 'btn-gold' : 'navlink u-self-start'} href="/dashboard">
          {t('verifyCta')}
        </Link>
      ) : null}
    </Frame>
  );
}

export function Unsubscribe() {
  const t = useTranslations('account');
  const params = useSearchParams();
  const userId = params.get('u');
  const token = params.get('t');
  const [state, setState] = useState<'working' | 'done' | 'failed'>(userId && token ? 'working' : 'failed');

  useEffect(() => {
    if (!userId || !token) return;
    let live = true;
    api('/email/unsubscribe', { method: 'POST', body: { userId, token }, expect: 'none' })
      .then(() => live && setState('done'))
      .catch(() => live && setState('failed'));
    return () => {
      live = false;
    };
  }, [userId, token]);

  return (
    <Frame title={t('unsubTitle')}>
      {state === 'working' ? (
        <p role="status" className="bag-muted">
          {t('unsubWorking')}
        </p>
      ) : null}
      {state === 'done' ? (
        <p role="status" className="bag-muted">
          {t('unsubDone')} {t('unsubBody')}
        </p>
      ) : null}
      {state === 'failed' ? (
        <p role="alert" className="field-error">
          {t('unsubFailed')}
        </p>
      ) : null}
      <Link className="btn-line" href="/">
        {t('unsubCta')}
      </Link>
    </Frame>
  );
}
