# Design tokens

The design has two themes, dark (default) and light, and a parchment band that stays light inside both. Every colour, font family, page width and motion curve is a value in **`packages/shared/src/brand.ts` → `BRAND.storefront`**, and nowhere else. `src/lib/theme-css.ts` turns them into CSS custom properties; no stylesheet holds a colour literal, and `src/lib/theme-css.spec.ts` fails if one does, or if a stylesheet uses a custom property nothing defines.

## Roles, not colours

Both themes have the same keys: `bg`, `bgRaised`, `bgSunken`, `text`, `text2`…`textDim`, `accent`, `accentHover`, `onAccent`, `lineRgb`/`bgRgb`/`textRgb` (channels, for `rgb(var(--line-rgb) / 0.16)`), `error`, the logotype's `shine*`, and `band.*` (the parchment panel). Light is a role-for-role inversion of dark; `error` is darkened in light to clear 4.5:1.

| CSS                                | From                                                                                                                                    |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `:root`                            | `themes.dark`                                                                                                                           |
| `[data-theme='light']` on `<html>` | `themes.light`                                                                                                                          |
| `[data-keep='dark']` on a section  | `themes.dark` again: the hero, the signature strip, the closing banner and any text laid over a photograph stay dark in the light theme |

The theme is chosen before first paint by a tiny script reading `localStorage['roya.theme']` (so a returning visitor never sees a flash), toggled from the top bar, and defaults to `BRAND.storefront.defaultTheme`.

## Fonts

Self-hosted from `@fontsource` (no request to a font CDN): Cormorant Garamond (headlines, prices), Cinzel (the logotype), Jost (body, labels), Amiri and IBM Plex Sans Arabic (Arabic display and body). Each `@font-face` has a `unicode-range`, so an English page never downloads the Arabic files. Changing a typeface is: the `BRAND.storefront.fonts` entry, the `@fontsource` imports in `app/[locale]/layout.tsx`.

## Motion

`settle`, `panel`, `sweep` and `film` are the four curves the design uses (`BRAND.storefront.motion` → `--ease-*`). **Reduced motion removes the movement and keeps what it carried**: text is simply visible, the three hero panels become one film, slideshows start paused, films show their poster frame and are not loaded. A film also only plays while on screen and not at all with the browser's data-saver on.

## Seven widths

The design names `xs 280 · sm 380 · fold 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`. `e2e/sweep.mjs` loads every page at all seven, in both themes and both languages, and fails on any horizontal overflow.
