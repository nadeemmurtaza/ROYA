import { redirect } from '@/i18n/navigation';

/**
 * The orders list is the desk's front page (`/desk`); only a single order has an
 * address under `/desk/orders/`. Someone who types the shorter-looking address,
 * or follows a bookmark to it, lands on the list instead of an error page.
 */
export default async function DeskOrdersRedirect({ params }: { params: Promise<{ locale: string }> }) {
  redirect({ href: '/desk', locale: (await params).locale });
}
