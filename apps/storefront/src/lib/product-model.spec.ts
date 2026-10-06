import type { ApiProduct, ApiVariant } from '@/types/api';
import {
  MADE_TO_MEASURE,
  cardImages,
  depositOf,
  fitsOf,
  galleryOf,
  pieceType,
  shadesOf,
  splitDescription,
  toCard,
  variantFor,
} from './product-model';

const variant = (over: Partial<ApiVariant>): ApiVariant => ({
  id: 'v',
  sku: 'S',
  size: 'FR 36',
  color: 'Ivory',
  colorHex: '#F3EFE6',
  price: 100,
  stock: 0,
  inStock: false,
  ...over,
});

describe('pieceType', () => {
  it('reads the type from the tags, and defaults to ready-to-wear', () => {
    expect(pieceType(['bespoke'])).toBe('bespoke');
    expect(pieceType(['accessory'])).toBe('accessory');
    expect(pieceType([])).toBe('ready');
    expect(pieceType(['bespoke', 'accessory'])).toBe('bespoke');
  });
});

describe('splitDescription', () => {
  it('separates the intro from its titled sections', () => {
    const parsed = splitDescription('Intro line.\n\n## The details\n\nDetail text.\n\n## Craftsmanship\n\nCraft text.');
    expect(parsed.intro).toBe('Intro line.');
    expect(parsed.sections).toEqual([
      { title: 'The details', body: 'Detail text.' },
      { title: 'Craftsmanship', body: 'Craft text.' },
    ]);
  });

  it('copes with a description that has no sections, or none at all', () => {
    expect(splitDescription('Only an intro.')).toEqual({ intro: 'Only an intro.', sections: [] });
    expect(splitDescription(null)).toEqual({ intro: '', sections: [] });
    expect(splitDescription('')).toEqual({ intro: '', sections: [] });
  });

  it('drops a section with no body rather than rendering an empty accordion', () => {
    expect(splitDescription('Intro\n\n## Empty\n\n').sections).toEqual([]);
  });
});

describe('shades and fits', () => {
  const variants = [
    variant({ color: 'Ivory', size: MADE_TO_MEASURE }),
    variant({ color: 'Ivory', size: 'FR 34' }),
    variant({ color: 'Pearl', size: MADE_TO_MEASURE, colorHex: '#E6E1D8' }),
    variant({ color: 'Pearl', size: 'FR 34' }),
  ];

  it('lists each shade once, in order', () => {
    expect(shadesOf(variants).map((shade) => shade.name)).toEqual(['Ivory', 'Pearl']);
  });

  it('lists each size once, with made to measure first', () => {
    expect(
      fitsOf([variant({ size: 'FR 34' }), variant({ size: MADE_TO_MEASURE }), variant({ size: 'FR 36' })]),
    ).toEqual([MADE_TO_MEASURE, 'FR 34', 'FR 36']);
  });

  it('finds the variant for a shade and size, or nothing', () => {
    expect(variantFor(variants, 'Pearl', 'FR 34')).toBe(variants[3]);
    expect(variantFor(variants, 'Lilac', 'FR 34')).toBeUndefined();
  });
});

describe('galleryOf and cardImages', () => {
  const product: Pick<ApiProduct, 'images' | 'name'> = {
    name: 'Mehr',
    images: [
      { url: '/media/images/a.jpg', alt: 'A', isPrimary: true },
      { url: '/media/video/mehr-film.mp4', alt: 'Film', isPrimary: false },
      { url: '/media/images/b.jpg', alt: null, isPrimary: false },
    ],
  };

  it('puts photographs before films and finds a film’s webm and poster by name', () => {
    const gallery = galleryOf(product);
    expect(gallery.map((item) => item.kind)).toEqual(['image', 'image', 'film']);
    const film = gallery[2];
    expect(film.kind === 'film' && film.film).toEqual({
      mp4: '/media/video/mehr-film.mp4',
      webm: '/media/video/mehr-film.webm',
      poster: '/media/posters/mehr-film.jpg',
    });
  });

  it('falls back to the product name for a missing alt', () => {
    expect(galleryOf(product)[1]).toMatchObject({ alt: 'Mehr' });
  });

  it('picks the cover and the hover photograph, never a film', () => {
    expect(cardImages(product)).toEqual({
      cover: { url: '/media/images/a.jpg', alt: 'A' },
      hover: '/media/images/b.jpg',
    });
    expect(cardImages({ name: 'X', images: [] })).toEqual({ cover: null, hover: null });
  });
});

describe('depositOf', () => {
  it('is the cheapest variant on a commission, when it is below the full price', () => {
    const product = { basePrice: 2_850_000, tags: ['bespoke'], variants: [variant({ price: 1_425_000 })] };
    expect(depositOf(product)).toBe(1_425_000);
  });

  it('is nothing for ready-to-wear, or when no variant carries a deposit', () => {
    expect(depositOf({ basePrice: 680_000, tags: [], variants: [variant({ price: 680_000 })] })).toBeNull();
    expect(depositOf({ basePrice: 100, tags: ['bespoke'], variants: [variant({ price: 100 })] })).toBeNull();
  });
});

describe('toCard', () => {
  const product = {
    id: 'p',
    slug: 'mehr',
    kind: 'STITCHED',
    name: 'Mehr',
    description: null,
    careInstructions: null,
    basePrice: 2_850_000,
    compareAtPrice: null,
    tags: ['bespoke'],
    images: [
      { url: '/media/images/a.jpg', alt: 'A', isPrimary: true },
      { url: '/media/images/b.jpg', alt: null, isPrimary: false },
    ],
    metaTitle: null,
    metaDescription: 'A blurb',
    variants: [],
    category: { id: 'c', slug: 'bridal', name: 'Bridal' },
    inStock: false,
    fromPrice: 1_425_000,
  } satisfies ApiProduct;

  it('prices a commission at its full price, marked "from"', () => {
    const card = toCard(product);
    expect(card).toMatchObject({ slug: 'mehr', price: 2_850_000, isFrom: true, tag: 'Bridal', blurb: 'A blurb' });
    expect(card.hover).toBe('/media/images/b.jpg');
  });

  it('survives a product with no category, no blurb and no images', () => {
    const card = toCard({ ...product, tags: [], category: null, metaDescription: null, images: [] });
    expect(card).toMatchObject({ isFrom: false, tag: '', blurb: '', cover: null, hover: null });
  });
});
