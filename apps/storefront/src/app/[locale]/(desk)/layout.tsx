import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Suspense, type ReactNode } from 'react';
import { DeskShell } from '@/components/desk/DeskShell';
import '@/styles/desk.css';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'desk' });
  // Staff only: nothing here is for a search engine, and no page of it is linked from the shop.
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/** The atelier desk stands apart from the shop: its own frame, no header or footer to browse away through. */
export default function DeskLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DeskShell>{children}</DeskShell>
    </Suspense>
  );
}
