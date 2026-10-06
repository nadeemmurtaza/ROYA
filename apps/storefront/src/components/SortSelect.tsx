'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from '@/i18n/navigation';
import { SORTS, type SortKey } from '@/lib/collection-query';

const LABEL: Record<SortKey, string> = {
  featured: 'sortFeatured',
  newest: 'sortNewest',
  price_desc: 'sortPriceDesc',
  price_asc: 'sortPriceAsc',
};

/** Changing the sort is a navigation, so the sorted view has its own shareable URL. */
export function SortSelect({ value }: { value: SortKey }) {
  const t = useTranslations('collection');
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function onChange(next: string) {
    const query = Object.fromEntries(params.entries());
    delete query.page; // a new order starts at the first page
    router.replace({ pathname, query: { ...query, sort: next } }, { scroll: false });
  }

  return (
    <>
      <label htmlFor="sort" className="sort-label">
        {t('sort')}
      </label>
      <select id="sort" className="sort-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {SORTS.map((key) => (
          <option key={key} value={key}>
            {t(LABEL[key])}
          </option>
        ))}
      </select>
    </>
  );
}
