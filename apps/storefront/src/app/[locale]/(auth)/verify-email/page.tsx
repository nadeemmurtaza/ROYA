import type { Metadata } from 'next';
import { Suspense } from 'react';
import { VerifyEmail } from '@/components/account/TokenPages';

export const metadata: Metadata = { robots: { index: false } };

export default function Page() {
  // useSearchParams needs a Suspense boundary above it.
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
