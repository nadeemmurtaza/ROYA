/**
 * The primary navigation. Bespoke and the atelier are sections of the Home
 * page, so they link to its anchors; the two collections filter the shop.
 */
export const NAV = [
  { key: 'bridal', href: { pathname: '/collection', query: { category: 'bridal' } } },
  { key: 'evening', href: { pathname: '/collection', query: { category: 'evening' } } },
  { key: 'bespoke', href: '/#commission' },
  { key: 'atelier', href: '/#atelier' },
] as const;
