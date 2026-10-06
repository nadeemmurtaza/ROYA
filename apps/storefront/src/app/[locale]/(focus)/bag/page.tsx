import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BagView } from '@/components/bag/BagView';
import { FocusHeader } from '@/components/FocusHeader';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'bag' });
  // A bag is private to its owner: nothing for a search engine to index.
  return { title: t('title'), robots: { index: false } };
}

export default async function BagPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('focus');
  return (
    <>
      <FocusHeader backHref="/collection" backLabel={t('continueShopping')} />
      <BagView />
    </>
  );
}
