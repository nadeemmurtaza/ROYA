import { BRAND } from '@newax/shared';

/**
 * The storefront's design tokens, as CSS.
 *
 * Every colour, font stack and motion curve the stylesheets use is a custom
 * property emitted from here, out of BRAND.storefront. No stylesheet holds a
 * colour literal (Law 1), so a rebrand is one file and the two themes cannot
 * drift apart.
 *
 *   :root                 the default theme, BRAND.storefront.defaultTheme (light)
 *   [data-theme='light']  the light theme, set on <html> by a saved choice
 *   [data-theme='dark']   the dark theme, set on <html> by a saved choice
 *   [data-keep='dark']    a section that stays dark inside the light theme
 *                         (the hero, the signature band, the closing banner)
 */

/** Both themes have the same keys with different values; typing by shape lets one function take either. */
type Theme = {
  readonly [key: string]: string | Readonly<Record<string, string>>;
  readonly band: Readonly<Record<string, string>>;
};

const kebab = (key: string): string => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

function themeVars(theme: Theme): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(theme)) {
    if (key === 'band' || typeof value !== 'string') continue;
    lines.push(`--${kebab(key)}:${value};`);
  }
  for (const [key, value] of Object.entries(theme.band)) {
    lines.push(`--band-${kebab(key)}:${value};`);
  }
  return lines.join('');
}

/** `'Cormorant Garamond', Garamond, 'Times New Roman', serif` */
export function fontStack(font: { family: string; fallback: readonly string[] }): string {
  const quote = (name: string) => (/[\s]/.test(name) ? `'${name}'` : name);
  return [font.family, ...font.fallback].map(quote).join(', ');
}

export function themeCss(): string {
  const { themes, fonts, layout, motion, defaultTheme } = BRAND.storefront;

  const shared = [
    `--font-serif:${fontStack(fonts.serif)};`,
    `--font-logo:${fontStack(fonts.logo)};`,
    `--font-sans:${fontStack(fonts.sans)};`,
    `--font-arabic:${fontStack(fonts.arabic)};`,
    `--font-arabic-sans:${fontStack(fonts.arabicSans)};`,
    `--max-width:${layout.maxWidth}px;`,
    `--gutter:${layout.gutter};`,
    `--ease-settle:${motion.settle};`,
    `--ease-panel:${motion.panel};`,
    `--ease-sweep:${motion.sweep};`,
    `--ease-film:${motion.film};`,
  ].join('');

  return [
    // The default is on :root so the page is right with no attribute at all (no script, or nothing saved).
    `:root{${shared}${themeVars(themes[defaultTheme])}color-scheme:${defaultTheme};}`,
    `[data-theme='light']{${themeVars(themes.light)}color-scheme:light;}`,
    `[data-theme='dark']{${themeVars(themes.dark)}color-scheme:dark;}`,
    `[data-keep='dark']{${themeVars(themes.dark)}color-scheme:dark;}`,
  ].join('\n');
}

/** Where the tokens are served from (app/theme.css/route.ts). */
export const THEME_CSS_PATH = '/theme.css';

/**
 * The stylesheet's URL, versioned by its content: a 32-bit FNV-1a hash (8 hex
 * characters) tells two builds of one brand's tokens apart, which is all the
 * URL needs it for. A collision could only serve a stale palette until the next
 * change, and this file is also imported by a client component, so it takes no
 * Node-only dependency to compute it.
 */
export function themeCssHref(): string {
  let hash = 0x811c9dc5;
  for (const char of themeCss()) {
    hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193) >>> 0;
  }
  return `${THEME_CSS_PATH}?v=${hash.toString(16).padStart(8, '0')}`;
}

/**
 * Runs before first paint so a returning visitor never sees the wrong theme
 * flash. The default (light) is already in the markup; this only switches when
 * a choice was saved. Wrapped in try/catch because storage can be blocked.
 */
export const THEME_STORAGE_KEY = 'roya.theme';
export const themeBootScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}`;
