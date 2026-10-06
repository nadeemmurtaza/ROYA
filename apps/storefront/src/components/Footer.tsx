import { BRAND } from '@newax/shared';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { instagramHandle, tiktokHandle } from '@/lib/brand-contact';
import { PrivateListForm } from './PrivateListForm';

export async function Footer() {
  const t = await getTranslations('footer');

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-lead">
          <span className="logo shine">{BRAND.identity.shortName}</span>
          <label htmlFor="private-list">{t('listPrompt')}</label>
          <PrivateListForm />
        </div>

        <nav className="footer-nav" aria-label={t('services')}>
          <span className="eyebrow">{t('services')}</span>
          <Link href="/#consult">{t('contactDesigner')}</Link>
          <Link href="/help/delivery">{t('delivery')}</Link>
          <Link href="/help/alterations">{t('alterations')}</Link>
          <Link href="/help/sizing">{t('sizing')}</Link>
          <Link href="/help/care">{t('care')}</Link>
        </nav>

        <nav className="footer-nav" aria-label={t('house')}>
          <span className="eyebrow">{t('house')}</span>
          <Link href="/#atelier">{t('atelier')}</Link>
          <a href={BRAND.socials.instagram} rel="noopener" target="_blank">
            {t('instagram', { handle: instagramHandle })}
          </a>
          <a href={BRAND.socials.tiktok} rel="noopener" target="_blank">
            {t('tiktok', { handle: tiktokHandle })}
          </a>
        </nav>
      </div>

      <div className="footer-base">
        <span>
          {t('rights', { year: new Date().getFullYear(), name: BRAND.identity.name, country: BRAND.contact.country })}
        </span>
        <span>{t('payments')}</span>
        <span>
          <Link href="/help/privacy">{t('privacy')}</Link> · <Link href="/help/terms">{t('terms')}</Link>
        </span>
      </div>
    </footer>
  );
}
