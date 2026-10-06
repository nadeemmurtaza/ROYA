import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('follows a path on this site', () => {
    expect(safeNext('/checkout')).toBe('/checkout');
    expect(safeNext('/product/mehr?x=1')).toBe('/product/mehr?x=1');
  });

  it('falls back for anything that could leave the site', () => {
    for (const bad of [
      '//evil.example',
      'https://evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      'evil',
      '/\u0000x',
    ]) {
      expect(safeNext(bad)).toBe('/dashboard');
    }
    expect(safeNext(null)).toBe('/dashboard');
    expect(safeNext('', '/bag')).toBe('/bag');
  });

  it('strips a language already in the path, since the router adds its own', () => {
    expect(safeNext('/ar/bag')).toBe('/bag');
    expect(safeNext('/en')).toBe('/dashboard');
    expect(safeNext('/english')).toBe('/english');
  });
});
