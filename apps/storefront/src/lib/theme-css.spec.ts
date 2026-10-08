import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND } from '@newax/shared';
import { THEME_CSS_PATH, fontStack, themeCss, themeCssHref } from './theme-css';

const STYLES = join(import.meta.dirname, '..', 'styles');

/** Custom properties a stylesheet sets for itself, outside the brand tokens. */
const LOCAL_PROPERTIES = new Set(['--step', '--cw', '--dir', '--o', '--s', '--facts']);

describe('themeCss', () => {
  const css = themeCss();

  it('defines the default theme on :root, the light theme and the keep-dark scope', () => {
    expect(css).toContain(':root{');
    expect(css).toContain("[data-theme='light']{");
    expect(css).toContain("[data-keep='dark']{");
  });

  it('emits every role token for both themes with the brand’s own value', () => {
    for (const [name, theme] of Object.entries(BRAND.storefront.themes)) {
      expect(theme.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(css).toContain(theme.bg);
      expect(css).toContain(theme.text);
      expect(name === 'dark' || name === 'light').toBe(true);
    }
  });

  it('is linked, not inlined: the href is the route, versioned by an 8-digit hash of the css', () => {
    expect(themeCssHref()).toMatch(new RegExp(`^${THEME_CSS_PATH.replace('.', '\\.')}\\?v=[0-9a-f]{8}$`));
    expect(themeCssHref()).toBe(themeCssHref());
  });

  it('builds a font stack with quoted multi-word names', () => {
    expect(fontStack(BRAND.storefront.fonts.serif)).toBe("'Cormorant Garamond', Garamond, 'Times New Roman', serif");
  });
});

describe('the stylesheets', () => {
  const files = readdirSync(STYLES).filter((name) => name.endsWith('.css'));
  const defined = new Set([...themeCss().matchAll(/(--[\w-]+):/g)].map((match) => match[1]!));

  it('only use custom properties that something defines (a typo here is a silent transparent colour)', () => {
    const undefinedUses: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(STYLES, file), 'utf8');
      for (const match of source.matchAll(/var\((--[\w-]+)/g)) {
        const name = match[1]!;
        if (!defined.has(name) && !LOCAL_PROPERTIES.has(name)) undefinedUses.push(`${file}: ${name}`);
      }
    }
    expect([...new Set(undefinedUses)]).toEqual([]);
  });

  it('hold no colour literal: every colour comes from the brand tokens (Law 1)', () => {
    const literals: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(STYLES, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      // #rgb / #rrggbb, and rgb()/rgba()/hsl() with numbers (rgb(var(--x)) is fine).
      for (const match of source.matchAll(/#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(\s*\d/g))
        literals.push(`${file}: ${match[0]}`);
    }
    expect(literals).toEqual([]);
  });
});
