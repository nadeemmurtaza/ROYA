import { getTranslations } from 'next-intl/server';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div className="app">
      <Header />
      <main id="content" className="empty-page">
        <span className="eyebrow">404</span>
        <h1 className="serif">{t('title')}</h1>
        <p>{t('body')}</p>
        <Link className="btn-gold" href="/collection">
          {t('cta')}
        </Link>
      </main>
      <Footer />
    </div>
  );
}
