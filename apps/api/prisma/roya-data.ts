/**
 * ROYA's catalogue, as data.
 *
 * Everything here comes from the design canvas (design/source): the six pieces
 * on the Home, Collection and Product pages, their prices, shades, galleries
 * and copy. Nothing is invented. Where the design left a fact open (lead time,
 * stock, the atelier's address) it is NOT filled in here; see
 * docs/OPEN-QUESTIONS.md.
 *
 * Kept apart from seed.ts so it can be tested without a database
 * (apps/api/test/roya-seed-data.spec.ts): unique SKUs, both locales present,
 * every media path really exists in the storefront's public folder.
 *
 * CONVENTIONS the storefront relies on (docs/CONTENT-MODEL.md):
 *  - `tags` carries the piece's type: `bespoke` (a commission: deposit +
 *    made to measure) or `accessory` (one size). No tag means ready-to-wear.
 *  - `description` is the intro paragraph, then optional `## ` sections the
 *    storefront turns into the accordion. `careInstructions` is the third
 *    accordion ("Delivery, fittings & care"). `metaDescription` is the
 *    one-line blurb on cards.
 *  - A bespoke piece's variants are priced at the DEPOSIT (`priceOverride`),
 *    while `basePrice` stays the full price ("of AED 28,500").
 *  - An image whose url ends in .mp4 is a film; the storefront finds its webm
 *    and poster by name under /media/video and /media/posters.
 *  - Made to measure is the variant whose `size` is MADE_TO_MEASURE.
 */

import { BRAND, toMinor } from '@newax/shared';

/** Copy is language-specific, so it is keyed by the language it is written in. seed.ts refuses to run if BRAND's second locale is not Arabic. */
export type Bilingual = { readonly en: string; readonly ar: string };

export const MADE_TO_MEASURE = 'MTM';
/** The sizes the atelier offers off the peg (the design's "Atelier sizes"). */
export const ATELIER_SIZES = ['FR 34', 'FR 36', 'FR 38', 'FR 40', 'FR 42', 'FR 44'] as const;

export interface Shade {
  readonly name: string;
  readonly hex: string;
}
export interface RoyaProduct {
  readonly slug: string;
  readonly categorySlug: 'bridal' | 'evening' | 'accessories';
  readonly type: 'bespoke' | 'ready-to-wear' | 'accessory';
  readonly priceMajor: number;
  readonly featuredRank: number;
  readonly name: Bilingual;
  /** Card blurb, also the SEO description. */
  readonly blurb: Bilingual;
  readonly intro: Bilingual;
  readonly details: Bilingual;
  readonly craft: Bilingual;
  readonly care: Bilingual;
  readonly shades: readonly Shade[];
  /** Media under apps/storefront/public, first image is the primary. */
  readonly media: ReadonlyArray<{ readonly url: string; readonly alt: Bilingual }>;
  readonly garmentKey?: 'gown';
}

const IVORY: Shade = { name: 'Ivory', hex: '#F3EFE6' };
const PEARL: Shade = { name: 'Pearl', hex: '#E6E1D8' };
const LILAC: Shade = { name: 'Lilac', hex: '#D9D0E6' };
const BLACK: Shade = { name: 'Black', hex: '#111111' };

export const CATEGORIES = [
  { slug: 'bridal', order: 1, name: { en: 'Bridal', ar: 'العرائس' } },
  { slug: 'evening', order: 2, name: { en: 'Evening', ar: 'السهرة' } },
  { slug: 'accessories', order: 3, name: { en: 'Accessories', ar: 'إكسسوارات' } },
] as const satisfies ReadonlyArray<{ slug: string; order: number; name: Bilingual }>;

export const PRODUCTS: readonly RoyaProduct[] = [
  {
    slug: 'mehr',
    categorySlug: 'bridal',
    type: 'bespoke',
    priceMajor: 28_500,
    featuredRank: 100,
    garmentKey: 'gown',
    name: { en: 'Mehr', ar: 'مهر' },
    blurb: {
      en: 'Strapless duchess satin, sculpted 3D florals',
      ar: 'فستان زفاف مفصّل بساتان الدوشيس وزهور ثلاثية الأبعاد',
    },
    intro: {
      en: 'Strapless duchess-satin column with a draped sash and sculpted 3D florals, each petal cut, shaped and stitched by hand. Worn with the cathedral tulle veil.',
      ar: 'عمود من ساتان الدوشيس بلا أكتاف، مع وشاح منسدل وزهور ثلاثية الأبعاد منحوتة، كل بتلة تُقصّ وتُشكَّل وتُخاط يدويًا. تُرتدى مع طرحة التول بطول الكاتدرائية.',
    },
    details: {
      en: 'Straight strapless neckline on a boned corset. Duchess satin with an asymmetric draped sash. Column skirt with a sweeping train and sculpted floral appliqué at the hem.',
      ar: 'خط صدر مستقيم بلا أكتاف على كورسيه مدعّم بأضلاع. ساتان الدوشيس مع وشاح منسدل غير متناظر. تنورة عمودية بذيل ممتد وزخرفة زهور منحوتة عند الحافة.',
    },
    craft: {
      en: 'Every floral is cut, shaped and stitched by hand in our UAE atelier. The corset is built in phases, and you receive films of your gown as it is made. Your name is stitched on the label inside.',
      ar: 'كل زهرة تُقصّ وتُشكَّل وتُخاط يدويًا في أتيليه رويا في الإمارات. يُبنى الكورسيه على مراحل، وتصلكِ أفلام عن فستانك أثناء صناعته. يُخاط اسمك على البطاقة في الداخل.',
    },
    care: {
      en: 'Hand-delivered in the black ROYA box across the UAE. Worldwide by insured courier on request.',
      ar: 'يُسلَّم باليد في علبة رويا السوداء في أنحاء الإمارات. وإلى مختلف أنحاء العالم عبر شركة توصيل مؤمَّنة عند الطلب.',
    },
    shades: [IVORY, PEARL, LILAC],
    media: [
      { url: '/media/images/mehr-front.jpg', alt: { en: 'Mehr, front view', ar: 'مهر، منظر أمامي' } },
      { url: '/media/images/mehr-walking-veil.jpg', alt: { en: 'Walking, veil lifted', ar: 'خلال المشي والطرحة مرفوعة' } },
      { url: '/media/images/mehr-back-veil.jpg', alt: { en: 'Back view with veil', ar: 'منظر خلفي مع الطرحة' } },
      { url: '/media/images/mehr-portrait.jpg', alt: { en: 'Portrait', ar: 'صورة شخصية' } },
      { url: '/media/video/mehr-film.mp4', alt: { en: 'The MEHR film', ar: 'فيلم مهر' } },
      { url: '/media/video/sculpting-florals.mp4', alt: { en: 'Sculpting the florals', ar: 'نحت الزهور' } },
    ],
  },
  {
    slug: 'mehr-veil',
    categorySlug: 'bridal',
    type: 'accessory',
    priceMajor: 3_200,
    featuredRank: 80,
    name: { en: 'Mehr Veil', ar: 'طرحة مهر' },
    blurb: { en: 'Cathedral-length tulle, raw-cut edge', ar: 'تول بطول الكاتدرائية، بحافة خام' },
    intro: {
      en: 'Cathedral-length veil in soft tulle with a raw-cut edge, cut to fall past the train.',
      ar: 'طرحة بطول الكاتدرائية من تول ناعم بحافة خام، تُقصّ لتنساب أبعد من الذيل.',
    },
    details: {
      en: 'Soft bridal tulle, single tier, raw-cut edge. Mounted on a clear comb.',
      ar: 'تول زفاف ناعم، طبقة واحدة، بحافة خام. مثبّتة على مشط شفاف.',
    },
    craft: {
      en: 'Cut and finished by hand to the length of your train.',
      ar: 'تُقصّ وتُنهى يدويًا بطول ذيل فستانك.',
    },
    care: {
      en: 'Delivered rolled in tissue. Steam on low heat.',
      ar: 'تُسلَّم ملفوفة في ورق التغليف. تُكوى بالبخار على حرارة منخفضة.',
    },
    shades: [IVORY],
    media: [
      { url: '/media/images/veil-from-behind.jpg', alt: { en: 'Mehr Veil from behind', ar: 'طرحة مهر من الخلف' } },
      { url: '/media/images/mehr-walking-veil.jpg', alt: { en: 'Lifted in the breeze', ar: 'مرفوعة مع النسيم' } },
      { url: '/media/images/mehr-back-veil.jpg', alt: { en: 'Full length', ar: 'بكامل طولها' } },
    ],
  },
  {
    slug: 'noir',
    categorySlug: 'evening',
    type: 'ready-to-wear',
    priceMajor: 6_800,
    featuredRank: 90,
    garmentKey: 'gown',
    name: { en: 'Noir', ar: 'نوار' },
    blurb: {
      en: 'Strapless satin gown, hand-placed pearl waistline',
      ar: 'فستان ساتان بلا أكتاف، خصر من اللؤلؤ مثبّت يدويًا',
    },
    intro: {
      en: 'Strapless sweetheart gown in black satin, built on a boned corset, with a full gathered skirt and a waistline of hand-placed pearls.',
      ar: 'فستان ساتان أسود بلا أكتاف بخط صدر على شكل قلب، مبني على كورسيه مدعّم بأضلاع، وتنورة مكشكشة واسعة وخصر من اللؤلؤ مثبّت يدويًا.',
    },
    details: {
      en: 'Sweetheart neckline on an internally boned corset with moulded cups. Black duchess satin. Gathered skirt with volume. Pearls of three sizes placed by hand along the waist.',
      ar: 'خط صدر على شكل قلب على كورسيه مدعّم من الداخل بأكواب مقولبة. ساتان دوشيس أسود. تنورة مكشكشة بحجم كامل. لآلئ بثلاثة أحجام مثبّتة يدويًا على طول الخصر.',
    },
    craft: {
      en: 'Corset built by hand in our UAE atelier; every pearl is sewn individually, never glued. Your name is stitched on the label inside.',
      ar: 'يُبنى الكورسيه يدويًا في أتيليه رويا في الإمارات؛ كل لؤلؤة تُخاط على حدة، ولا تُلصق أبدًا. يُخاط اسمك على البطاقة في الداخل.',
    },
    care: {
      en: 'Delivered in the black ROYA box. Spot-clean only; store flat in its tissue.',
      ar: 'يُسلَّم في علبة رويا السوداء. تنظيف موضعي فقط؛ يُحفظ مسطّحًا في ورق التغليف.',
    },
    shades: [BLACK],
    media: [
      { url: '/media/images/noir-on-form.jpg', alt: { en: 'Noir on the form', ar: 'نوار على المجسّم' } },
      { url: '/media/images/noir-pearl-waist.jpg', alt: { en: 'Bodice and pearl waist', ar: 'الصدر والخصر المرصّع باللؤلؤ' } },
      { url: '/media/images/noir-corset-inside.jpg', alt: { en: 'Inside the corset', ar: 'داخل الكورسيه' } },
      { url: '/media/images/opera-gloves.jpg', alt: { en: 'Styled with opera gloves', ar: 'مع قفازات الأوبرا' } },
    ],
  },
  {
    slug: 'lilas',
    categorySlug: 'evening',
    type: 'ready-to-wear',
    priceMajor: 7_400,
    featuredRank: 85,
    garmentKey: 'gown',
    name: { en: 'Lilas', ar: 'ليلاس' },
    blurb: {
      en: 'Lilac satin, organza blossoms with pearl centres',
      ar: 'ساتان ليلكي بزهور أورغانزا وقلوب من اللؤلؤ',
    },
    intro: {
      en: 'Lilac satin scattered with organza blossoms built petal by petal, each centred with pearls and glass beads.',
      ar: 'ساتان ليلكي تتناثر عليه زهور أورغانزا تُبنى بتلةً بتلة، وفي قلب كل زهرة لآلئ وخرز زجاجي.',
    },
    details: {
      en: 'Lilac satin with an organza overlay. Three-dimensional blossoms in satin and organza, centred with pearls and glass seed beads.',
      ar: 'ساتان ليلكي بطبقة أورغانزا. زهور ثلاثية الأبعاد من الساتان والأورغانزا، في قلبها لآلئ وخرز زجاجي صغير.',
    },
    craft: {
      en: 'Each blossom is cut, layered and stitched by hand, then beaded at the centre. No two are identical.',
      ar: 'تُقصّ كل زهرة وتُرتَّب طبقاتها وتُخاط يدويًا، ثم يُطرَّز قلبها بالخرز. لا توجد زهرتان متطابقتان.',
    },
    care: {
      en: 'Delivered folded in tissue in the black ROYA box. Steam gently from the inside.',
      ar: 'يُسلَّم مطويًا في ورق التغليف داخل علبة رويا السوداء. يُكوى بالبخار برفق من الداخل.',
    },
    shades: [LILAC],
    media: [
      { url: '/media/images/lilas-blossom.jpg', alt: { en: 'Hand-sewn blossom', ar: 'زهرة مخيطة يدويًا' } },
      { url: '/media/images/lilas-in-box.jpg', alt: { en: 'In its ROYA box', ar: 'في علبة رويا' } },
    ],
  },
  {
    slug: 'noir-corset',
    categorySlug: 'evening',
    type: 'ready-to-wear',
    priceMajor: 4_900,
    featuredRank: 70,
    garmentKey: 'gown',
    name: { en: 'Noir Corset', ar: 'كورسيه نوار' },
    blurb: { en: 'Boned satin corset, pearl-scattered waist', ar: 'ساتان بأضلاع ولآلئ متناثرة' },
    intro: {
      en: 'Boned black satin corset with sweetheart cups and a waist scattered with pearls.',
      ar: 'كورسيه من الساتان الأسود المدعّم بأضلاع، بأكواب على شكل قلب وخصر تتناثر عليه اللآلئ.',
    },
    details: {
      en: 'Black satin, fully lined, internally boned with moulded cups. Hidden back zip.',
      ar: 'ساتان أسود، مبطّن بالكامل، مدعّم من الداخل بأكواب مقولبة. سحّاب خلفي مخفي.',
    },
    craft: {
      en: 'Built panel by panel in our UAE atelier.',
      ar: 'يُبنى لوحةً لوحة في أتيليه رويا في الإمارات.',
    },
    care: { en: 'Delivered in the black ROYA box.', ar: 'يُسلَّم في علبة رويا السوداء.' },
    shades: [BLACK],
    media: [
      { url: '/media/images/noir-corset-inside.jpg', alt: { en: 'Corset structure', ar: 'بنية الكورسيه' } },
      { url: '/media/images/noir-pearl-waist.jpg', alt: { en: 'Pearl waist', ar: 'الخصر المرصّع باللؤلؤ' } },
    ],
  },
  {
    slug: 'opera-gloves',
    categorySlug: 'accessories',
    type: 'accessory',
    priceMajor: 950,
    featuredRank: 60,
    name: { en: 'Opera Gloves', ar: 'قفازات الأوبرا' },
    blurb: { en: 'Black floral lace, elbow length', ar: 'دانتيل أسود مزهّر بطول المرفق' },
    intro: {
      en: 'Elbow-length gloves in black floral lace.',
      ar: 'قفازات بطول المرفق من دانتيل أسود مزهّر.',
    },
    details: { en: 'Stretch floral lace, elbow length.', ar: 'دانتيل مزهّر مرن بطول المرفق.' },
    craft: { en: 'Finished by hand at the cuff.', ar: 'تُنهى يدويًا عند الكُمّ.' },
    care: {
      en: 'Hand wash cold, dry flat.',
      ar: 'تُغسل يدويًا بماء بارد وتُجفَّف مسطّحة.',
    },
    shades: [BLACK],
    media: [
      { url: '/media/images/opera-gloves.jpg', alt: { en: 'Worn with pearls', ar: 'مع اللؤلؤ' } },
      { url: '/media/images/roya-box.jpg', alt: { en: 'In the ROYA box', ar: 'في علبة رويا' } },
    ],
  },
];

/** Collections the Home page draws from, in the design's order. */
/**
 * The design's "Presentation" step in the bag offers the black ROYA box (free), a
 * monogrammed couture trunk (AED 1,200) or plain packaging (free). Only the trunk
 * costs anything, so it is the one that needs to be a product: it is added to the
 * bag as a line, which keeps the total, the VAT and the invoice right with no
 * special case. It is a GOODS product, which the storefront's default browse
 * (STITCHED) never lists; the bag finds it by this slug.
 */
export const PRESENTATION_TRUNK = {
  slug: 'couture-trunk',
  sku: 'COUTURE-TRUNK',
  priceMajor: 1_200,
  name: { en: 'Couture trunk', ar: 'صندوق الأزياء الراقية' },
  description: {
    en: 'A monogrammed garment trunk, in place of the box.',
    ar: 'صندوق أزياء مطرّز بالأحرف الأولى، بدلاً من العلبة.',
  },
} as const;

export const COLLECTIONS = [
  {
    slug: 'signature',
    name: { en: 'Signature pieces', ar: 'القطع المميّزة' },
    members: ['mehr', 'noir', 'mehr-veil', 'lilas', 'noir-corset', 'opera-gloves'],
  },
  {
    slug: 'new',
    name: { en: 'New at ROYA', ar: 'جديد رويا' },
    members: ['noir', 'lilas', 'mehr-veil', 'opera-gloves'],
  },
] as const satisfies ReadonlyArray<{ slug: string; name: Bilingual; members: readonly string[] }>;

/**
 * The measurements the atelier takes at a first fitting (Dashboard,
 * "Measurements"), in centimetres. The ranges are validation bounds for an
 * adult, not design facts: editable from the back office.
 */
export const GOWN = {
  key: 'gown',
  label: { en: 'Gown', ar: 'فستان' } satisfies Bilingual,
  fields: [
    { key: 'bust', en: 'Bust', ar: 'محيط الصدر', min: 60, max: 160 },
    { key: 'underbust', en: 'Under-bust', ar: 'تحت الصدر', min: 55, max: 150 },
    { key: 'waist', en: 'Waist', ar: 'الخصر', min: 45, max: 150 },
    { key: 'hips', en: 'Hips', ar: 'محيط الأرداف', min: 70, max: 170 },
    { key: 'shoulder_width', en: 'Shoulder width', ar: 'عرض الكتف', min: 25, max: 60 },
    { key: 'arm_length', en: 'Arm length', ar: 'طول الذراع', min: 40, max: 80 },
    { key: 'nape_to_waist', en: 'Nape to waist', ar: 'من الرقبة إلى الخصر', min: 30, max: 60 },
    { key: 'floor_length', en: 'Floor length (heels)', ar: 'الطول حتى الأرض (بالكعب)', min: 100, max: 190 },
  ],
} as const;

/** Where a delivery goes and how: the three methods of the design's Delivery step. */
export const SHIPPING = {
  zones: [
    {
      key: 'uae',
      label: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة' },
      cities: BRAND.locale.regions,
      isCatchAll: false,
    },
    {
      key: 'international',
      label: { en: 'Outside the UAE', ar: 'خارج الإمارات' },
      cities: [] as readonly string[],
      isCatchAll: true,
    },
  ],
  methods: [
    {
      key: 'white_glove',
      label: { en: 'White-glove delivery', ar: 'توصيل فاخر بالقفازات البيضاء' },
      // The design gives no lead time for UAE delivery ("[X] days"); 1-2 is a
      // placeholder the atelier replaces.
      etaMinDays: 1,
      etaMaxDays: 2,
    },
    {
      key: 'atelier_collection',
      label: { en: 'Collect at the ROYA atelier', ar: 'الاستلام من أتيليه رويا' },
      etaMinDays: 1,
      etaMaxDays: 2,
    },
    {
      key: 'international_courier',
      label: { en: 'International · insured courier', ar: 'دولي · شركة توصيل مؤمَّنة' },
      // The design: "Door to door in 3-5 days".
      etaMinDays: 3,
      etaMaxDays: 5,
    },
  ],
  rates: [
    { zone: 'uae', method: 'white_glove', feeMajor: 0 },
    { zone: 'uae', method: 'atelier_collection', feeMajor: 0 },
    { zone: 'international', method: 'international_courier', feeMajor: 950 },
  ],
} as const;

/** The deposit a bespoke piece starts with, in minor units. */
export function depositMinor(priceMajor: number): number {
  return Math.round((toMinor(priceMajor) * BRAND.commerce.bespokeDepositPercent) / 100);
}
