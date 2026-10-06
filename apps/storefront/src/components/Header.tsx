import { BRAND } from '@newax/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BagLink } from './BagLink';
import { CurrencySelect } from './CurrencySelect';
import { HeartIcon, AccountIcon } from './icons';
import { LocaleSwitch } from './LocaleSwitch';
import { MobileMenu } from './MobileMenu';
import { SearchOverlay } from './SearchOverlay';
import { ThemeToggle } from './ThemeToggle';
import { NAV } from './nav';

/** The tagline set letter by letter under the logotype, spread to its width. */
function Tagline({ text }: { text: string }) {
  return (
    <span className="logo brand-line" aria-hidden="true">
      {[...text.toUpperCase()].map((letter, index) => (
        <span key={index}>{letter === ' ' ? ' ' : letter}</span>
      ))}
    </span>
  );
}

export async function Header() {
  const t = await getTranslations('shell');

  return (
    <>
      <div className="topbar">
        <span className="hide-sm">{t('announce')}</span>
        <div className="topbar-tools">
          <Link href="/#consult" className="hide-sm">
            {t('consult')}
          </Link>
          <ThemeToggle />
          <CurrencySelect />
          <LocaleSwitch />
        </div>
      </div>

      <header className="site-header">
        <div className="hdr-left">
          <MobileMenu />
          <nav className="nav-desk" aria-label={t('primary')}>
            {NAV.map((item) => (
              <Link key={item.key} className="navlink" href={item.href}>
                {t(`nav.${item.key}`)}
              </Link>
            ))}
          </nav>
        </div>

        <Link href="/" className="brand" aria-label={t('home')}>
          <span className="logo shine brand-name">{BRAND.identity.shortName}</span>
          <Tagline text={BRAND.identity.tagline} />
        </Link>

        <div className="hdr-right">
          <SearchOverlay />
          <Link className="icon-btn" href="/account" aria-label={t('account')}>
            <AccountIcon />
          </Link>
          <Link className="icon-btn hide-sm" href="/dashboard" aria-label={t('wishlist')}>
            <HeartIcon />
          </Link>
          <BagLink />
        </div>
      </header>
    </>
  );
}
