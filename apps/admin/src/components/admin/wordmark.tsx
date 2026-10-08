import { BRAND } from '@newax/shared';
import { cn } from '@/utils/cn';

/**
 * The name of the house, set the way the storefront sets its logotype: Cinzel,
 * capitals, wide tracking. The leading padding is the tracking, so the word
 * sits optically centred when it is centred (the sign-in page) and flush
 * when it is not.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('font-logo font-normal uppercase tracking-logo ps-[0.24em] text-neutral-900', className)}>
      {BRAND.identity.adminName}
    </span>
  );
}
