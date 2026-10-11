import { imageAlt } from './catalog.service';

describe('imageAlt', () => {
  const rows = [{ locale: 'ar', alt: 'طرحة مهر' }];

  it('uses the asked-for language when it has a row', () => {
    expect(imageAlt(rows, 'ar', 'Mehr Veil')).toBe('طرحة مهر');
  });

  it('falls back to the image’s own column, not to another language’s row', () => {
    // An English reader must not be handed the Arabic text just because it is the only row.
    expect(imageAlt(rows, 'en', 'Mehr Veil')).toBe('Mehr Veil');
  });

  it('is null when there is nothing in any language', () => {
    expect(imageAlt([], 'en', null)).toBeNull();
  });
});
