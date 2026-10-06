import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FocusHeader } from '@/components/FocusHeader';
import { OrderView } from '@/components/order/OrderView';

type Props = { params: Promise<{ locale: string; number: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'order' });
  return { title: t('thanks'), robots: { index: false } };
}

export default async function OrderPage({ params }: Props) {
  const { locale, number } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('focus');
  return (
    <>
      <FocusHeader backHref="/collection" backLabel={t('continueShopping')} />
      <OrderView number={decodeURIComponent(number)} />
    </>
  );
}
