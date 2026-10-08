import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { themeCss } from '@/lib/theme-css';
import { GET } from './route';

describe('GET /theme.css', () => {
  it('serves the design tokens as a stylesheet', async () => {
    const response = GET();
    expect(response.headers.get('Content-Type')).toBe('text/css; charset=utf-8');
    expect(await response.text()).toBe(themeCss());
  });

  it('is cached for a year as immutable, which the content-hashed href makes safe', () => {
    expect(GET().headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
  });
});

describe('the document', () => {
  const layout = readFileSync(join(import.meta.dirname, '..', '[locale]', 'layout.tsx'), 'utf8');

  it('links the tokens stylesheet and renders no <style> element', () => {
    expect(layout).toContain('<link rel="stylesheet" href={themeCssHref()} />');
    expect(layout).not.toMatch(/<style[\s>]/);
  });

  it('loads the utility stylesheet after the component ones, so it wins ties as an inline style did', () => {
    const order = [...layout.matchAll(/import '@\/styles\/([\w-]+)\.css'/g)].map((match) => match[1]);
    expect(order[order.length - 1]).toBe('utility');
  });
});
