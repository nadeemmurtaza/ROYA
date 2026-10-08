'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { BRAND, normalizePhone } from '@newax/shared';
import { Field } from '@/components/checkout/Field';
import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { whatsappUrl } from '@/lib/brand-contact';
import { deskSections } from '@/lib/desk-model';
import { image } from '@/lib/media';
import { safeNext } from '@/lib/safe-next';
import { useSession } from '@/providers/session';
import type { AuthUser } from '@/types/api';

type Mode = 'in' | 'up' | 'forgot';
type Errors = Partial<Record<'identifier' | 'password' | 'firstName' | 'email' | 'phone' | 'form', string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Sign in, create an account, or ask for a reset link. The page is also where a
 * guest who wants their saved details is sent from the bag and checkout, so it
 * returns to `?next=` afterwards (only ever to a path on this site).
 */
export function AccountForm() {
  const t = useTranslations('account');
  const router = useRouter();
  const params = useSearchParams();
  const session = useSession();
  const next = safeNext(params.get('next'));
  /** Atelier staff who sign in without being sent somewhere land on the desk, not the client dashboard. */
  const landingFor = (user: AuthUser | null) =>
    !params.get('next') && deskSections(user?.permissions).length > 0 ? '/desk' : next;

  const [mode, setMode] = useState<Mode>(params.get('mode') === 'register' ? 'up' : 'in');
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [values, setValues] = useState({
    identifier: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    list: false,
  });

  // Already signed in: nothing to do here.
  const sessionLanding = landingFor(session.user);
  useEffect(() => {
    if (session.status === 'signed-in' && !busy) router.replace(sessionLanding);
  }, [session.status, busy, router, sessionLanding]);

  const set = (field: keyof typeof values, value: string | boolean) =>
    setValues((current) => ({ ...current, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: Errors = {};

    if (mode === 'forgot') {
      if (!EMAIL.test(values.email.trim())) found.email = t('errEmail');
    } else if (mode === 'in') {
      if (!values.identifier.trim()) found.identifier = t('errIdentifier');
      if (!values.password) found.password = t('errPassword');
    } else {
      if (!values.firstName.trim()) found.firstName = t('errName');
      if (!EMAIL.test(values.email.trim())) found.email = t('errEmail');
      if (values.phone.trim() && normalizePhone(values.phone).e164 === null) found.phone = t('errPhone');
      if (values.password.length < 8) found.password = t('errNewPassword');
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      if (mode === 'forgot') {
        await api('/auth/forgot-password', {
          method: 'POST',
          body: { email: values.email.trim() },
          expect: 'none',
        });
        setSent(true);
      } else if (mode === 'in') {
        const signedIn = await session.login(values.identifier.trim(), values.password);
        router.replace(landingFor(signedIn));
      } else {
        await session.register({
          email: values.email.trim(),
          password: values.password,
          firstName: values.firstName.trim(),
          ...(values.lastName.trim() ? { lastName: values.lastName.trim() } : {}),
          ...(values.phone.trim() ? { phone: normalizePhone(values.phone).e164 ?? undefined } : {}),
        });
        if (values.list) {
          // Best effort: joining the list must never fail the sign-up that has already succeeded.
          void api('/crm/enquiries', {
            method: 'POST',
            body: {
              name: `${values.firstName} ${values.lastName}`.trim(),
              email: values.email.trim(),
              source: 'private-list',
            },
            expect: 'none',
          }).catch(() => undefined);
        }
        router.replace(next);
      }
    } catch (failure) {
      setErrors({
        form:
          mode === 'in' ? t('failedIn') : failure instanceof Error && failure.message ? failure.message : t('failedUp'),
      });
    } finally {
      setBusy(false);
    }
  }

  const benefits = [t('b1'), t('b2'), t('b3'), t('b4')];

  return (
    <div className="account-page">
      <aside className="ph account-aside" data-keep="dark">
        <Image
          src={image('mehr-portrait')}
          alt={t('asideAlt')}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 50vw"
          className="photo"
          style={{ objectPosition: '50% 20%' }}
        />
        <div className="account-shade" aria-hidden="true" />
        <Link href="/" className="account-logo" aria-label={BRAND.identity.shortName}>
          <span className="logo shine">{BRAND.identity.shortName}</span>
        </Link>
        <div className="account-pitch">
          <span className="eyebrow">{t('asideEyebrow')}</span>
          <p className="serif">{t.rich('asideTitle', { em: (chunks) => <em>{chunks}</em> })}</p>
          <ul>
            {benefits.map((benefit) => (
              <li key={benefit}>
                <span aria-hidden="true" className="dash" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="account-main" aria-labelledby="account-title">
        <div className="account-card fade">
          <Link href="/" className="back">
            {t('back')}
          </Link>

          {mode === 'forgot' ? (
            <>
              <h1 id="account-title" className="serif">
                {t('forgotTitle')}
              </h1>
              <p className="bag-muted">{sent ? t('forgotSent') : t('forgotBody')}</p>
            </>
          ) : (
            <>
              <h1 id="account-title" className="sr-only">
                {t('metaTitle')}
              </h1>
              <div role="group" aria-label={t('tabsAria')} className="auth-tabs">
                {(['in', 'up'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className={`auth-tab${mode === tab ? ' auth-tab-on' : ''}`}
                    aria-pressed={mode === tab}
                    onClick={() => {
                      setMode(tab);
                      setErrors({});
                    }}
                  >
                    {tab === 'in' ? t('signIn') : t('create')}
                  </button>
                ))}
              </div>
            </>
          )}

          {!(mode === 'forgot' && sent) ? (
            <form className="auth-form" onSubmit={submit} noValidate>
              {mode === 'up' ? (
                <div className="two">
                  <Field id="a-first" label={t('firstName')} error={errors.firstName}>
                    <input
                      id="a-first"
                      className="field"
                      autoComplete="given-name"
                      value={values.firstName}
                      onChange={(event) => set('firstName', event.target.value)}
                      aria-invalid={errors.firstName ? true : undefined}
                      aria-describedby="a-first-error"
                    />
                  </Field>
                  <Field id="a-last" label={t('lastName')}>
                    <input
                      id="a-last"
                      className="field"
                      autoComplete="family-name"
                      value={values.lastName}
                      onChange={(event) => set('lastName', event.target.value)}
                    />
                  </Field>
                </div>
              ) : null}

              {mode === 'in' ? (
                <Field id="a-identifier" label={t('identifier')} error={errors.identifier}>
                  <input
                    id="a-identifier"
                    className="field"
                    autoComplete="username"
                    dir="ltr"
                    value={values.identifier}
                    onChange={(event) => set('identifier', event.target.value)}
                    aria-invalid={errors.identifier ? true : undefined}
                    aria-describedby="a-identifier-error"
                  />
                </Field>
              ) : (
                <Field id="a-email" label={t('email')} error={errors.email}>
                  <input
                    id="a-email"
                    className="field"
                    type="email"
                    autoComplete="email"
                    dir="ltr"
                    placeholder="you@example.com"
                    value={values.email}
                    onChange={(event) => set('email', event.target.value)}
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby="a-email-error"
                  />
                </Field>
              )}

              {mode === 'up' ? (
                <Field id="a-phone" label={t('phone')} error={errors.phone}>
                  <input
                    id="a-phone"
                    className="field"
                    type="tel"
                    autoComplete="tel"
                    dir="ltr"
                    placeholder="+971 50 123 4567"
                    value={values.phone}
                    onChange={(event) => set('phone', event.target.value)}
                    aria-invalid={errors.phone ? true : undefined}
                    aria-describedby="a-phone-error"
                  />
                </Field>
              ) : null}

              {mode !== 'forgot' ? (
                <div className="f">
                  <div className="label-row">
                    <label className="lbl" htmlFor="a-password">
                      {t('password')}
                    </label>
                    {mode === 'in' ? (
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => {
                          setMode('forgot');
                          setErrors({});
                        }}
                      >
                        {t('forgot')}
                      </button>
                    ) : null}
                  </div>
                  <div className="pw">
                    <input
                      id="a-password"
                      className="field"
                      type={reveal ? 'text' : 'password'}
                      autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                      dir="ltr"
                      value={values.password}
                      onChange={(event) => set('password', event.target.value)}
                      aria-invalid={errors.password ? true : undefined}
                      aria-describedby="a-password-error"
                    />
                    <button
                      type="button"
                      className="pw-toggle"
                      aria-label={reveal ? t('hideAria') : t('showAria')}
                      onClick={() => setReveal((value) => !value)}
                    >
                      {reveal ? t('hide') : t('show')}
                    </button>
                  </div>
                  <span
                    id="a-password-error"
                    role={errors.password ? 'alert' : undefined}
                    className="field-error f-error"
                  >
                    {errors.password}
                  </span>
                  {mode === 'up' ? <span className="bag-muted-sm">{t('passwordHint')}</span> : null}
                </div>
              ) : null}

              {mode === 'up' ? (
                <label className="terms">
                  <input
                    type="checkbox"
                    checked={values.list}
                    onChange={(event) => set('list', event.target.checked)}
                  />
                  <span>{t('privateList')}</span>
                </label>
              ) : null}

              {errors.form ? (
                <p role="alert" className="field-error">
                  {errors.form}
                </p>
              ) : null}

              <button type="submit" className="btn-gold" disabled={busy}>
                {busy ? t('working') : mode === 'in' ? t('submitIn') : mode === 'up' ? t('submitUp') : t('forgotSend')}
              </button>
            </form>
          ) : null}

          {mode === 'forgot' ? (
            <button
              type="button"
              className="inline-link center"
              onClick={() => {
                setMode('in');
                setSent(false);
                setErrors({});
              }}
            >
              {t('backToSignIn')}
            </button>
          ) : (
            <>
              <p className="account-person">
                {t.rich('person', {
                  link: (chunks) => (
                    <a href={whatsappUrl} rel="noopener" target="_blank">
                      {chunks}
                    </a>
                  ),
                })}
              </p>
              <Link href="/bag" className="guest-link">
                {t('guest')}
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
