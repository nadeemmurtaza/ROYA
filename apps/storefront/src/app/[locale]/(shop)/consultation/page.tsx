import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ConsultationForm } from '@/components/ConsultationForm';
import { alternatesFor } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'consultation' });
  return { title: t('metaTitle'), alternates: alternatesFor(locale, '/consultation') };
}

export default function ConsultationPage() {
  return (
    <Suspense fallback={null}>
      <ConsultationForm />
    </Suspense>
  );
}
