'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { BRAND, SECOND_LOCALE, intlTag, type Locale } from '@newax/shared';
import { Field } from '@/components/checkout/Field';
import { Link } from '@/i18n/navigation';
import { api, apiAuthed } from '@/lib/api';
import { EMIRATES, OUTSIDE } from '@/lib/checkout-model';
import { formatPrice } from '@/lib/money';
import { useAuthedQuery } from '@/lib/use-authed-query';
import type { ApiProduct, Order, Paged } from '@/types/api';
import { useWishlist } from '@/providers/wishlist';
import { Price } from '@/providers/currency';

/** Shown while a pane's data loads, and when it could not be had. */
function PaneState({ status, onRetry }: { status: 'loading' | 'error'; onRetry: () => void }) {
  const t = useTranslations('dashboard');
  return status === 'loading' ? (
    <p className="bag-muted" role="status">
      {t('loading')}
    </p>
  ) : (
    <div className="stack" style={{ gap: 12, alignItems: 'flex-start' }}>
      <p className="field-error" role="alert">
        {t('loadFailed')}
      </p>
      <button type="button" className="btn-line" onClick={onRetry}>
        {t('retry')}
      </button>
    </div>
  );
}

const dayFormat = (locale: Locale, value: string): string =>
  new Intl.DateTimeFormat(intlTag(locale), { dateStyle: 'medium', timeZone: BRAND.locale.timeZone }).format(
    new Date(value),
  );

export function OrderRow({ order, locale }: { order: Order; locale: Locale }) {
  const t = useTranslations('dashboard');
  const first = order.items[0];
  const more = order.items.length - 1;
  const name = first ? (locale === SECOND_LOCALE && first.nameUr ? first.nameUr : first.nameEn) : order.number;
  return (
    <li className="order-row">
      <span className="ph order-thumb">
        {first?.imageUrl ? (
          <Image
            src={first.imageUrl}
            alt=""
            fill
            sizes="96px"
            className="photo"
            style={{ objectPosition: '50% 25%' }}
          />
        ) : null}
      </span>
      <span className="stack" style={{ gap: 6, minWidth: 0 }}>
        <span className="serif order-name">
          {name}
          {more > 0 ? <span className="bag-muted-sm"> +{more}</span> : null}
        </span>
        <span className="bag-muted-sm" dir="ltr" style={{ textAlign: 'start' }}>
          {order.number}
        </span>
        <span className="bag-muted-sm">{t('orderOn', { date: dayFormat(locale, order.placedAt) })}</span>
        <span style={{ fontSize: 14, color: 'var(--text3)' }}>
          <Price minor={order.grandTotal} charged />
        </span>
      </span>
      <span className="stack" style={{ gap: 12, alignItems: 'flex-end' }}>
        <span className="status-pill">{t(`status_${order.status}` as 'status_PENDING')}</span>
        <Link className="navlink" href={`/orders/${encodeURIComponent(order.number)}`}>
          {t('orderView')}
        </Link>
      </span>
    </li>
  );
}

export function OrdersPane({ limit, showAll }: { limit?: number; showAll?: boolean }) {
  const t = useTranslations('dashboard');
  const locale = useLocale() as Locale;
  const { state, reload } = useAuthedQuery<Paged<Order>>('/orders/mine', { pageSize: limit ?? 20 });
  if (state.status !== 'ready') return <PaneState status={state.status} onRetry={reload} />;
  const orders = state.data.data;
  if (orders.length === 0) {
    return (
      <div className="card-box">
        <span className="serif" style={{ fontSize: 26 }}>
          {t('noOrders')}
        </span>
        <span className="bag-muted">{t('noOrdersBody')}</span>
        <Link className="btn-gold" href="/collection">
          {t('noOrdersCta')}
        </Link>
      </div>
    );
  }
  return (
    <section className="card-box" aria-label={t('recent')}>
      {showAll ? (
        <div className="card-head">
          <span className="serif" style={{ fontSize: 26 }}>
            {t('recent')}
          </span>
          <Link className="navlink" href={{ pathname: '/dashboard', query: { tab: 'orders' } }}>
            {t('latestMore')}
          </Link>
        </div>
      ) : null}
      <ul className="order-list">
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} locale={locale} />
        ))}
      </ul>
    </section>
  );
}

export function FittingsPane() {
  const t = useTranslations('dashboard');
  return (
    <div className="card-box" style={{ alignItems: 'flex-start' }}>
      <span className="bag-muted" style={{ maxWidth: 560 }}>
        {t('fittingsBody')}
      </span>
      <Link className="btn-gold" href={{ pathname: '/consultation', query: { kind: 'atelier' } }}>
        {t('fittingsCta')}
      </Link>
    </div>
  );
}

interface Profile {
  id: string;
  label: string;
  values: Record<string, number>;
  createdAt: string;
  garmentType: { key: string; labelEn: string; labelUr: string };
}
interface GarmentType {
  key: string;
  fields: Array<{ key: string; labelEn: string; labelUr: string; unit: string; order: number }>;
}

export function MeasurementsPane() {
  const t = useTranslations('dashboard');
  const locale = useLocale() as Locale;
  const profiles = useAuthedQuery<Profile[]>('/measurements/profiles');
  const [garments, setGarments] = useState<GarmentType[]>([]);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    api<GarmentType[]>('/measurements/garment-types')
      .then(setGarments)
      .catch(() => undefined);
  }, []);

  if (profiles.state.status !== 'ready') return <PaneState status={profiles.state.status} onRetry={profiles.reload} />;
  const list = profiles.state.data;
  const second = locale === SECOND_LOCALE;

  return (
    <div className="stack" style={{ gap: 28 }}>
      <p className="bag-muted" style={{ maxWidth: 560 }}>
        {t('measureBody')}
      </p>
      {list.length === 0 ? (
        <div className="card-box">
          <span className="bag-muted">{t('measureNone')}</span>
        </div>
      ) : null}
      {list.map((profile) => {
        const fields =
          garments
            .find((garment) => garment.key === profile.garmentType.key)
            ?.fields.slice()
            .sort((a, b) => a.order - b.order) ?? [];
        return (
          <section key={profile.id} className="stack" style={{ gap: 14 }} aria-label={profile.label}>
            <div className="card-head">
              <span className="serif" style={{ fontSize: 24 }}>
                {profile.label}
                <span className="bag-muted-sm">
                  {' '}
                  · {second ? profile.garmentType.labelUr : profile.garmentType.labelEn}
                </span>
              </span>
              <span className="bag-muted-sm">{t('measureTaken', { date: dayFormat(locale, profile.createdAt) })}</span>
            </div>
            <dl className="measure-grid">
              {fields.map((field) => (
                <div key={field.key}>
                  <dt>{second ? field.labelUr : field.labelEn}</dt>
                  <dd className="serif" dir="ltr">
                    {shown && profile.values[field.key] !== undefined
                      ? `${profile.values[field.key]} ${field.unit.toLowerCase()}`
                      : '•• cm'}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
      {list.length > 0 ? (
        <button
          type="button"
          className="btn-line"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setShown((value) => !value)}
          aria-pressed={shown}
        >
          {shown ? t('measureHide') : t('measureReveal')}
        </button>
      ) : null}
    </div>
  );
}

export function WishlistPane() {
  const t = useTranslations('dashboard');
  const locale = useLocale() as Locale;
  const wishlist = useWishlist();
  const [catalogue, setCatalogue] = useState<Map<string, ApiProduct>>(new Map());

  // The saved list carries English names; the catalogue in the reader's language gives the right ones.
  useEffect(() => {
    api<Paged<ApiProduct>>('/catalog/products', { query: { locale, pageSize: 100 } })
      .then((page) => setCatalogue(new Map(page.data.map((product) => [product.slug, product]))))
      .catch(() => undefined);
  }, [locale]);

  if (wishlist.loading)
    return (
      <p className="bag-muted" role="status">
        {t('loading')}
      </p>
    );
  if (wishlist.items.length === 0) {
    return (
      <div className="card-box" style={{ alignItems: 'flex-start' }}>
        <span className="serif" style={{ fontSize: 26 }}>
          {t('wishNone')}
        </span>
        <span className="bag-muted">{t('wishBody')}</span>
        <Link className="btn-gold" href="/collection">
          {t('wishCta')}
        </Link>
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 20 }}>
      <p className="bag-muted" style={{ maxWidth: 560 }}>
        {t('wishBody')}
      </p>
      <ul className="wish-grid">
        {wishlist.items.map((item) => {
          const known = catalogue.get(item.slug);
          return (
            <li key={item.id} className="wish-card">
              <Link href={`/product/${item.slug}`} className="ph wish-photo">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill sizes="(max-width: 700px) 50vw, 240px" className="photo" />
                ) : null}
              </Link>
              <span className="serif" style={{ fontSize: 22 }}>
                {known?.name ?? item.name}
              </span>
              <span style={{ fontSize: 14, color: 'var(--text3)' }}>{formatPrice(known?.basePrice ?? item.price)}</span>
              <div className="bag-actions">
                <Link className="lnk" href={`/product/${item.slug}`}>
                  {t('wishView')}
                </Link>
                <button type="button" className="lnk" onClick={() => void wishlist.remove(item.id)}>
                  {t('wishRemove')}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface SavedAddress {
  id: string;
  label: string | null;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  province: string;
  isDefault: boolean;
}

export function AddressesPane() {
  const t = useTranslations('dashboard');
  const q = useAuthedQuery<SavedAddress[]>('/addresses');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState({
    label: '',
    fullName: '',
    phone: '',
    emirate: '',
    city: '',
    country: '',
    area: '',
    line1: '',
  });
  const checkout = useTranslations('checkout');

  if (q.state.status !== 'ready') return <PaneState status={q.state.status} onRetry={q.reload} />;
  const addresses = q.state.data;
  const abroad = form.emirate === OUTSIDE;

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFailed(false);
    try {
      await apiAuthed('/addresses', {
        method: 'POST',
        body: {
          label: form.label.trim() || undefined,
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          line1: form.line1.trim(),
          line2: form.area.trim() || undefined,
          city: abroad ? form.city.trim() : form.emirate,
          province: abroad ? form.country.trim() : form.emirate,
          isDefault: addresses.length === 0,
        },
      });
      setAdding(false);
      setForm({ label: '', fullName: '', phone: '', emirate: '', city: '', country: '', area: '', line1: '' });
      q.reload();
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  async function act(id: string, action: 'default' | 'delete') {
    try {
      if (action === 'delete')
        await apiAuthed(`/addresses/${encodeURIComponent(id)}`, { method: 'DELETE', expect: 'none' });
      else await apiAuthed(`/addresses/${encodeURIComponent(id)}`, { method: 'PATCH', body: { isDefault: true } });
    } finally {
      q.reload();
    }
  }

  const bind = (field: keyof typeof form) => ({
    id: `ad-${field}`,
    className: 'field',
    value: form[field],
    onChange: (event: { target: { value: string } }) =>
      setForm((current) => ({ ...current, [field]: event.target.value })),
  });

  return (
    <div className="stack" style={{ gap: 24 }}>
      <p className="bag-muted" style={{ maxWidth: 560 }}>
        {t('addrBody')}
      </p>
      {addresses.length === 0 && !adding ? (
        <div className="card-box">
          <span className="bag-muted">{t('addrNone')}</span>
        </div>
      ) : null}
      <ul className="addr-grid">
        {addresses.map((address) => (
          <li key={address.id} className="card-box">
            <span className="eyebrow">
              {address.label || t('addrLabelPlaceholder')} {address.isDefault ? `· ${t('addrDefault')}` : ''}
            </span>
            <span style={{ lineHeight: 1.7 }}>
              {address.fullName}
              <br />
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ''}
              <br />
              {address.city}
              {address.province !== address.city ? `, ${address.province}` : ''}
              <br />
              <bdi dir="ltr">{address.phone}</bdi>
            </span>
            <div className="bag-actions" style={{ marginTop: 'auto' }}>
              {!address.isDefault ? (
                <button type="button" className="lnk" onClick={() => void act(address.id, 'default')}>
                  {t('addrMakeDefault')}
                </button>
              ) : null}
              <button type="button" className="lnk" onClick={() => void act(address.id, 'delete')}>
                {t('addrDelete')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <form className="card-box" onSubmit={save}>
          <div className="field-grid">
            <Field id="ad-label" label={t('addrLabel')}>
              <input {...bind('label')} placeholder={t('addrLabelPlaceholder')} />
            </Field>
            <Field id="ad-fullName" label={checkout('fullName')}>
              <input {...bind('fullName')} autoComplete="name" required />
            </Field>
            <Field id="ad-phone" label={checkout('phone')}>
              <input {...bind('phone')} type="tel" autoComplete="tel" dir="ltr" required />
            </Field>
            <Field id="ad-emirate" label={checkout('emirate')}>
              <select {...bind('emirate')} required>
                <option value="">{checkout('emirateChoose')}</option>
                {EMIRATES.map((emirate) => (
                  <option key={emirate} value={emirate}>
                    {emirate}
                  </option>
                ))}
                <option value={OUTSIDE}>{checkout('outside')}</option>
              </select>
            </Field>
            {abroad ? (
              <>
                <Field id="ad-city" label={checkout('city')}>
                  <input {...bind('city')} required />
                </Field>
                <Field id="ad-country" label={checkout('country')}>
                  <input {...bind('country')} required />
                </Field>
              </>
            ) : (
              <Field id="ad-area" label={checkout('area')}>
                <input {...bind('area')} />
              </Field>
            )}
            <Field id="ad-line1" label={checkout('line1')} wide>
              <input {...bind('line1')} required />
            </Field>
          </div>
          {failed ? (
            <p role="alert" className="field-error">
              {t('addrFailed')}
            </p>
          ) : null}
          <div className="btn-row">
            <button type="submit" className="btn-gold" disabled={saving}>
              {saving ? t('addrSaving') : t('addrSave')}
            </button>
            <button type="button" className="btn-line" onClick={() => setAdding(false)}>
              {t('addrCancel')}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-line" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}>
          {t('addrAdd')}
        </button>
      )}
    </div>
  );
}
