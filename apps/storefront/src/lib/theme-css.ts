import { BRAND } from '@newax/shared';

/**
 * The storefront's design tokens, as CSS.
 *
 * Every colour, font stack and motion curve the stylesheets use is a custom
 * property emitted from here, out of BRAND.storefront. No stylesheet holds a
 * colour literal (Law 1), so a rebrand is one file and the two themes cannot
 * drift apart.
 *
 *   :root                 the default theme (dark)
 *   [data-theme='light']  the light theme, set on <html>
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
  const { themes, fonts, layout, motion } = BRAND.storefront;

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
    `:root{${shared}${themeVars(themes.dark)}color-scheme:dark;}`,
    `[data-theme='light']{${themeVars(themes.light)}color-scheme:light;}`,
    `[data-keep='dark']{${themeVars(themes.dark)}color-scheme:dark;}`,
  ].join('\n');
}

/**
 * Runs before first paint so a returning visitor never sees the wrong theme
 * flash. The default (dark) is already in the markup; this only switches when
 * a choice was saved. Wrapped in try/catch because storage can be blocked.
 */
export const THEME_STORAGE_KEY = 'roya.theme';
export const themeBootScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}`;
