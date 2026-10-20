'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { BRAND } from '@newax/shared';
import { Link, useRouter } from '@/i18n/navigation';
import { whatsappUrl } from '@/lib/brand-contact';
import { deskSections } from '@/lib/desk-model';
import { useSession } from '@/providers/session';
import { CommissionPane, CommissionSummary, FittingsPane } from './CommissionPane';
import { AddressesPane, MeasurementsPane, OrdersPane, WishlistPane } from './Panes';

const TABS = ['overview', 'orders', 'commission', 'fittings', 'measurements', 'wishlist', 'addresses'] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: 'tabOverview',
  orders: 'tabOrders',
  commission: 'tabCommission',
  fittings: 'tabFittings',
  measurements: 'tabMeasurements',
  wishlist: 'tabWishlist',
  addresses: 'tabAddresses',
};

/** The part of the day in the shop's own timezone, whatever the visitor's clock says. */
function dayPart(now = new Date()): 'Morning' | 'Afternoon' | 'Evening' {
  const hour = Number(
    new Intl.DateTimeFormat('en', { hour: 'numeric', hourCycle: 'h23', timeZone: BRAND.locale.timeZone }).format(now),
  );
  return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
}

/**
 * The private client's account. Signed-out visitors are sent to sign in and
 * brought back. Everything shown is real data from the API: orders and their
 * status, saved measurements, the wishlist, addresses.
 */
export function Dashboard() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const session = useSession();
  const params = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : 'overview';

  useEffect(() => {
    // Signing in brings the visitor back to the tab they asked for, not the overview.
    if (session.status === 'anonymous')
      router.replace({
        pathname: '/account',
        query: { next: tab === 'overview' ? '/dashboard' : `/dashboard?tab=${tab}` },
      });
  }, [session.status, router, tab]);

  if (session.status !== 'signed-in' || !session.user) {
    return (
      <div className="dash-page">
        <p className="bag-muted" role="status">
          {t('loading')}
        </p>
      </div>
    );
  }

  const user = session.user;
  const name = user.firstName?.trim() ?? '';
  const part = dayPart();
  const greeting = name ? t.rich(`greet${part}`, { name, em: (chunks) => <em>{chunks}</em> }) : t(`greet${part}No`);

  return (
    <div className="dash-page">
      <nav aria-label={t('navAria')} className="dash-nav">
        <div className="stack u-gap-8">
          <span className="eyebrow">{t('eyebrow')}</span>
          <span className="serif u-fs-30">
            {[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}
          </span>
        </div>
        <div className="stack">
          {TABS.map((id) => (
            <Link
              key={id}
              href={id === 'overview' ? '/dashboard' : { pathname: '/dashboard', query: { tab: id } }}
              className={`side${id === tab ? ' side-on' : ''}`}
              aria-current={id === tab ? 'page' : undefined}
            >
              {t(TAB_LABEL[id])}
              <span aria-hidden="true" className="flip-rtl">
                →
              </span>
            </Link>
          ))}
          {deskSections(user.permissions).length > 0 ? (
            <Link href="/desk" className="side">
              {t('deskLink')}
              <span aria-hidden="true" className="flip-rtl">
                →
              </span>
            </Link>
          ) : null}
          <button
            type="button"
            className="side"
            onClick={async () => {
              await session.logout();
              router.replace('/');
            }}
          >
            {t('signOut')}
          </button>
        </div>
      </nav>

      <div className="dash-main pane" key={tab}>
        {tab === 'overview' ? (
          <>
            <h1 className="serif dash-title">{greeting}</h1>
            <div className="dash-cards">
              <section className="card-box" aria-label={t('apptEyebrow')}>
                <span className="eyebrow">{t('apptEyebrow')}</span>
                <span className="serif u-fs-28">{t('apptTitle')}</span>
                <span className="bag-muted">{t('apptBody')}</span>
                <Link
                  className="btn-gold u-mt-auto u-self-start"
                  href={{ pathname: '/consultation', query: { kind: 'atelier' } }}
                >
                  {t('apptCta')}
                </Link>
              </section>
              <section className="card-box" aria-label={t('designerEyebrow')}>
                <span className="eyebrow">{t('designerEyebrow')}</span>
                <div className="designer">
                  <span className="designer-seal" aria-hidden="true">
                    <span className="logo">{BRAND.identity.shortName}</span>
                  </span>
                  <span className="bag-muted-sm">{t('designerRole', { house: BRAND.identity.name })}</span>
                </div>
                <span className="bag-muted">{t('designerBody')}</span>
                <a className="btn-gold u-mt-auto u-self-start" href={whatsappUrl} rel="noopener" target="_blank">
                  {t('designerCta')}
                </a>
              </section>
            </div>
            <CommissionSummary />
            <OrdersPane limit={3} showAll />
          </>
        ) : (
          <>
            <h1 className="serif dash-title">
              {tab === 'orders'
                ? t('ordersTitle')
                : tab === 'commission'
                  ? t('commissionTitle')
                  : tab === 'fittings'
                    ? t('fittingsTitle')
                    : tab === 'measurements'
                      ? t('measureTitle')
                      : tab === 'wishlist'
                        ? t('wishTitle')
                        : t('addrTitle')}
            </h1>
            {tab === 'orders' ? <OrdersPane /> : null}
            {tab === 'commission' ? <CommissionPane /> : null}
            {tab === 'fittings' ? <FittingsPane /> : null}
            {tab === 'measurements' ? <MeasurementsPane /> : null}
            {tab === 'wishlist' ? <WishlistPane /> : null}
            {tab === 'addresses' ? <AddressesPane /> : null}
          </>
        )}
      </div>
    </div>
  );
}
