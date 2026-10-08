'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ORDER_STATUSES, SECOND_LOCALE, type Locale } from '@newax/shared';
import { Link, useRouter } from '@/i18n/navigation';
import { isOrderStatus, paymentState } from '@/lib/desk-model';
import { useAuthedQuery } from '@/lib/use-authed-query';
import type { AdminOrder, Paged } from '@/types/api';
import { LoadState, Amount, PaymentPill, StatusPill, useStamp } from './parts';

const PAGE_SIZE = 20;

/** The first piece's name in the reader's language, and how many more the order holds. */
function pieces(order: AdminOrder, locale: Locale): { name: string; more: number } {
  const first = order.items[0];
  const name = first ? (locale === SECOND_LOCALE && first.nameUr ? first.nameUr : first.nameEn) : '';
  return { name, more: Math.max(0, order.items.length - 1) };
}

/**
 * Every order, newest first: search by number, name, phone or email, narrow by
 * status, page through. The filters live in the address, so the back button and
 * a shared link both land where they were.
 */
export function OrdersList() {
  const t = useTranslations('desk');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const params = useSearchParams();
  const stamp = useStamp();

  const q = params.get('q') ?? '';
  const rawStatus = params.get('status');
  const status = isOrderStatus(rawStatus) ? rawStatus : '';
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);

  const { state, reload } = useAuthedQuery<Paged<AdminOrder>>('/admin/orders', {
    page,
    pageSize: PAGE_SIZE,
    q,
    status,
  });

  const go = (next: { q?: string; status?: string; page?: number }) => {
    const nextQ = next.q ?? q;
    const nextStatus = next.status ?? status;
    const nextPage = next.page ?? 1;
    router.replace({
      pathname: '/desk',
      query: {
        ...(nextQ ? { q: nextQ } : {}),
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(nextPage > 1 ? { page: nextPage } : {}),
      },
    });
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    go({ q: draft.trim(), page: 1 });
  };

  const filtered = q !== '' || status !== '';
  const total = state.status === 'ready' ? state.data.meta.total : null;

  return (
    <>
      <div className="desk-head">
        <h1 className="serif desk-title">{t('ordersTitle')}</h1>
        {total !== null ? <span className="bag-muted-sm">{t('ordersCount', { count: total })}</span> : null}
      </div>

      <form className="desk-filters" role="search" onSubmit={submit}>
        <div className="desk-search">
          <label className="sr-only" htmlFor="desk-q">
            {t('searchLabel')}
          </label>
          <input
            id="desk-q"
            className="field"
            type="search"
            value={draft}
            placeholder={t('searchPlaceholder')}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="btn-line">
            {t('searchButton')}
          </button>
        </div>
        <div className="desk-status">
          <label className="lbl" htmlFor="desk-status">
            {t('statusFilter')}
          </label>
          <select
            id="desk-status"
            className="field"
            value={status}
            onChange={(event) => go({ status: event.target.value, page: 1 })}
          >
            <option value="">{t('statusAll')}</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`status_${value}`)}
              </option>
            ))}
          </select>
        </div>
      </form>

      {state.status !== 'ready' ? (
        <LoadState status={state.status} onRetry={reload} />
      ) : state.data.data.length === 0 ? (
        <div className="desk-card">
          <span className="serif desk-empty">{filtered ? t('noOrdersFiltered') : t('noOrders')}</span>
          {filtered ? (
            <button
              type="button"
              className="btn-line"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => {
                setDraft('');
                router.replace('/desk');
              }}
            >
              {t('clearFilters')}
            </button>
          ) : (
            <span className="bag-muted">{t('noOrdersBody')}</span>
          )}
        </div>
      ) : (
        <>
          <ul className="desk-list">
            {state.data.data.map((order) => {
              const { name, more } = pieces(order, locale);
              return (
                <li key={order.id} className="desk-row">
                  <span className="desk-cell desk-cell-id">
                    <Link className="serif desk-number" href={`/desk/orders/${encodeURIComponent(order.id)}`}>
                      <bdi dir="ltr">{order.number}</bdi>
                    </Link>
                    <span className="bag-muted-sm">{t('placedOn', { date: stamp(order.placedAt) })}</span>
                  </span>
                  <span className="desk-cell">
                    <span>{order.guestName ?? order.shippingAddress?.fullName ?? '—'}</span>
                    <span className="bag-muted-sm">
                      {name}
                      {more > 0 ? ` ${t('andMore', { count: more })}` : ''}
                    </span>
                  </span>
                  <span className="desk-cell desk-cell-total serif">
                    <Amount minor={order.grandTotal} />
                  </span>
                  <span className="desk-cell desk-cell-pills">
                    <StatusPill status={order.status} />
                    <PaymentPill state={paymentState(order.payments)} />
                  </span>
                </li>
              );
            })}
          </ul>

          {state.data.meta.totalPages > 1 ? (
            <nav className="desk-pager" aria-label={t('pagesAria')}>
              <button
                type="button"
                className="btn-line"
                disabled={!state.data.meta.hasPrevious}
                onClick={() => go({ page: page - 1 })}
              >
                {t('pagePrev')}
              </button>
              <span className="bag-muted-sm">
                {t('pageOf', { page: state.data.meta.page, pages: state.data.meta.totalPages })}
              </span>
              <button
                type="button"
                className="btn-line"
                disabled={!state.data.meta.hasNext}
                onClick={() => go({ page: page + 1 })}
              >
                {t('pageNext')}
              </button>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
