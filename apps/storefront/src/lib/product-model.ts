import type { ApiProduct, ApiVariant } from '@/types/api';
import { filmFromUrl, isFilmUrl, type FilmSources } from './media';

/**
 * What the storefront reads out of a catalogue product. The engine stores a
 * product generically (name, description, tags, variants); ROYA's own
 * conventions on top of that are written here and in docs/CONTENT-MODEL.md,
 * so the page components never parse a string themselves.
 */

/** The variant whose size is this is the made-to-measure option. Matches the seed. */
export const MADE_TO_MEASURE = 'MTM';

export type PieceType = 'bespoke' | 'accessory' | 'ready';

/** `tags` carries the type: `bespoke` or `accessory`; no tag means ready-to-wear. */
export function pieceType(tags: readonly string[]): PieceType {
  if (tags.includes('bespoke')) return 'bespoke';
  if (tags.includes('accessory')) return 'accessory';
  return 'ready';
}

export interface DescriptionSection {
  title: string;
  body: string;
}

/** The intro paragraph, then each `## Title` block as a section. */
export function splitDescription(description: string | null | undefined): {
  intro: string;
  sections: DescriptionSection[];
} {
  const text = (description ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return { intro: '', sections: [] };

  const [intro, ...rest] = text.split(/^## /m);
  const sections = rest
    .map((chunk) => {
      const newline = chunk.indexOf('\n');
      const title = (newline === -1 ? chunk : chunk.slice(0, newline)).trim();
      const body = (newline === -1 ? '' : chunk.slice(newline + 1)).trim();
      return { title, body };
    })
    .filter((section) => section.title && section.body);

  return { intro: intro.trim(), sections };
}

export interface Shade {
  name: string;
  hex: string | null;
}

/** The shades a piece comes in, in the order the atelier listed them. */
export function shadesOf(variants: readonly ApiVariant[]): Shade[] {
  const seen = new Map<string, Shade>();
  for (const variant of variants) {
    if (variant.color && !seen.has(variant.color)) {
      seen.set(variant.color, { name: variant.color, hex: variant.colorHex });
    }
  }
  return [...seen.values()];
}

/** The sizes a piece comes in, with made to measure first if it is offered. */
export function fitsOf(variants: readonly ApiVariant[]): string[] {
  const seen: string[] = [];
  for (const variant of variants) {
    if (variant.size && !seen.includes(variant.size)) seen.push(variant.size);
  }
  return seen.sort((a, b) => Number(b === MADE_TO_MEASURE) - Number(a === MADE_TO_MEASURE));
}

export function variantFor(
  variants: readonly ApiVariant[],
  shade: string | null,
  fit: string | null,
): ApiVariant | undefined {
  return variants.find(
    (variant) => (shade === null || variant.color === shade) && (fit === null || variant.size === fit),
  );
}

export type GalleryItem =
  { kind: 'image'; url: string; alt: string } | { kind: 'film'; url: string; alt: string; film: FilmSources };

/** Photographs first, then the films, as the design lays the gallery out. */
export function galleryOf(product: Pick<ApiProduct, 'images' | 'name'>): GalleryItem[] {
  const items: GalleryItem[] = [];
  for (const media of product.images) {
    const alt = media.alt || product.name;
    const sources = isFilmUrl(media.url) ? filmFromUrl(media.url) : null;
    items.push(sources ? { kind: 'film', url: media.url, alt, film: sources } : { kind: 'image', url: media.url, alt });
  }
  return [...items.filter((item) => item.kind === 'image'), ...items.filter((item) => item.kind === 'film')];
}

/** The two photographs a card shows: the cover, and the one it fades to on hover. */
export function cardImages(product: Pick<ApiProduct, 'images' | 'name'>): {
  cover: { url: string; alt: string } | null;
  hover: string | null;
} {
  const photos = galleryOf(product).filter((item) => item.kind === 'image');
  const [cover, second] = photos;
  return {
    cover: cover ? { url: cover.url, alt: cover.alt } : null,
    hover: second ? second.url : null,
  };
}

/**
 * The deposit on a commission, as the engine prices it: the made-to-measure
 * variant carries the deposit as its price while `basePrice` stays the whole.
 */
export function depositOf(product: Pick<ApiProduct, 'basePrice' | 'variants' | 'tags'>): number | null {
  if (pieceType(product.tags) !== 'bespoke') return null;
  const deposits = product.variants.map((variant) => variant.price).filter((price) => price > 0);
  if (deposits.length === 0) return null;
  const deposit = Math.min(...deposits);
  return deposit < product.basePrice ? deposit : null;
}

/** What a card, a strip slide or a search hit needs from a product, and nothing more. */
export interface PieceCard {
  slug: string;
  name: string;
  blurb: string;
  /** Integer fils: the full price. */
  price: number;
  /** A commission is priced "from"; the prefix is translated by the caller. */
  isFrom: boolean;
  tag: string;
  cover: { url: string; alt: string } | null;
  hover: string | null;
}

export function toCard(product: ApiProduct): PieceCard {
  const { cover, hover } = cardImages(product);
  return {
    slug: product.slug,
    name: product.name,
    blurb: product.metaDescription ?? '',
    price: product.basePrice,
    isFrom: pieceType(product.tags) === 'bespoke',
    tag: product.category?.name ?? '',
    cover,
    hover,
  };
}
