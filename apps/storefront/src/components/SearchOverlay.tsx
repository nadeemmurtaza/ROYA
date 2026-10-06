'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { BRAND } from '@newax/shared';
import { Link, usePathname } from '@/i18n/navigation';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/money';
import { CloseIcon, SearchIcon } from './icons';

interface Hit {
  id: string;
  slug: string;
  name: string;
  basePrice: number;
  imageUrl: string | null;
  category: string | null;
}

type State = { status: 'idle' } | { status: 'loading' } | { status: 'done'; hits: Hit[] } | { status: 'error' };

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;
const MAX_HITS = 6;

/**
 * Search the house: a full-screen overlay with the query in display type, the
 * quick links the design offers, and live results under the box. The API's own
 * search (typo tolerant, synonym aware) does the matching; this only asks.
 */
export function SearchOverlay() {
  const t = useTranslations('shell');
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ status: 'idle' });
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setState({ status: 'idle' });
    trigger.current?.focus();
  }, []);

  // Navigating (picking a result) closes the overlay.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Scroll lock and autofocus while open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    input.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Debounced search; a newer keystroke cancels the older request.
  useEffect(() => {
    const text = query.trim();
    if (!open || text.length < MIN_CHARS) {
      setState({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setState({ status: 'loading' });
      try {
        const result = await api<{ data: Hit[] }>('/search', {
          query: { q: text, locale, pageSize: MAX_HITS },
          signal: controller.signal,
        });
        setState({ status: 'done', hits: result.data.slice(0, MAX_HITS) });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') setState({ status: 'error' });
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, locale]);

  // Escape closes; Tab stays inside the dialog. Listening on the document means it works wherever focus is.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === 'Tab' && overlay.current) {
        const items = overlay.current.querySelectorAll<HTMLElement>('a[href], button, input');
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="icon-btn hide-sm"
        aria-label={t('searchOpen')}
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
      </button>

      {open ? (
        <div ref={overlay} className="search-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <div className="search-head">
            <span className="logo" style={{ fontSize: 22, letterSpacing: '0.5em' }} id={titleId}>
              <span className="sr-only">{t('searchDialog')}</span>
              <span aria-hidden="true">ROYA</span>
            </span>
            <button type="button" className="icon-btn" aria-label={t('searchClose')} onClick={close}>
              <CloseIcon size={22} />
            </button>
          </div>

          <div className="search-body">
            <label htmlFor="site-search" className="eyebrow">
              {t('searchLabel')}
            </label>
            <input
              ref={input}
              id="site-search"
              type="search"
              className="search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
            />

            <div className="search-chips">
              <Link className="btn-line" href={`/product/${BRAND.storefront.featured.flagship}`}>
                {t('chipFlagship')}
              </Link>
              <Link className="btn-line" href={{ pathname: '/collection', query: { category: 'bridal' } }}>
                {t('chipBridal')}
              </Link>
              <Link className="btn-line" href={{ pathname: '/collection', query: { category: 'evening' } }}>
                {t('chipEvening')}
              </Link>
              <Link className="btn-line" href={`/product/${BRAND.storefront.featured.secondary}`}>
                {t('chipSecondary')}
              </Link>
              <Link className="btn-line" href="/#commission">
                {t('chipBespoke')}
              </Link>
            </div>

            <div aria-live="polite">
              {state.status === 'loading' ? <p className="search-note">{t('searching')}…</p> : null}
              {state.status === 'error' ? <p className="search-note">{t('searchError')}</p> : null}
              {state.status === 'done' && state.hits.length === 0 ? (
                <p className="search-note">{t('searchNone', { query: query.trim() })}</p>
              ) : null}
              {state.status === 'done' && state.hits.length > 0 ? (
                <ul className="search-results">
                  {state.hits.map((hit) => (
                    <li key={hit.id}>
                      <Link className="search-hit" href={`/product/${hit.slug}`}>
                        <span className="thumb ph">
                          {hit.imageUrl ? (
                            <Image src={hit.imageUrl} alt="" fill sizes="56px" className="photo" />
                          ) : null}
                        </span>
                        <span>
                          <span className="serif" style={{ fontSize: 22 }}>
                            {hit.name}
                          </span>
                          {hit.category ? (
                            <span className="search-note" style={{ display: 'block', fontSize: 13 }}>
                              {hit.category}
                            </span>
                          ) : null}
                        </span>
                        <span style={{ fontSize: 14 }}>
                          <bdi dir="ltr">{formatPrice(hit.basePrice)}</bdi>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
