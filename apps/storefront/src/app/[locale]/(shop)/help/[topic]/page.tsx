import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { alternatesFor } from '@/lib/seo';

/** The pages the footer links to. Their wording lives in the message files, so it is translated and edited like any other copy. */
const TOPICS = ['delivery', 'alterations', 'sizing', 'care', 'privacy', 'terms'] as const;
type Topic = (typeof TOPICS)[number];
const isTopic = (value: string): value is Topic => (TOPICS as readonly string[]).includes(value);

type Props = { params: Promise<{ locale: string; topic: string }> };

export function generateStaticParams() {
  return TOPICS.map((topic) => ({ topic }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, topic } = await params;
  if (!isTopic(topic)) return {};
  const t = await getTranslations({ locale, namespace: 'help' });
  return {
    title: t(`${topic}.title`),
    description: t(`${topic}.lead`),
    alternates: alternatesFor(locale, `/help/${topic}`),
  };
}

export default async function HelpPage({ params }: Props) {
  const { locale, topic } = await params;
  if (!isTopic(topic)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations('help');

  return (
    <article className="help-page">
      <Link href="/" className="back">
        {t('back')}
      </Link>
      <h1 className="serif">{t(`${topic}.title`)}</h1>
      <p className="help-lead serif">{t(`${topic}.lead`)}</p>
      <p className="help-body">{t(`${topic}.body`)}</p>
      <p className="bag-muted">{t('more')}</p>
      <Link className="btn-gold" href="/consultation" style={{ alignSelf: 'flex-start' }}>
        {t('contact')}
      </Link>
    </article>
  );
}
