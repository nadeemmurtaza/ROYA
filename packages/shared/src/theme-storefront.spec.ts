import { BRAND } from './brand';
import { contrastRatioHex } from './theme-contrast';

/**
 * The back office wears the storefront: the roles the two share are the same
 * values, in both themes, so a repaint of the storefront repaints the back
 * office with it. The Blueprint's teal and cool greys are gone from both.
 */
const { themes } = BRAND.storefront;
const pairs = [
  ['light', BRAND.theme.colors, themes.light],
  ['dark', BRAND.theme.colorsDark, themes.dark],
] as const;

describe.each(pairs)('%s back office palette', (_name, admin, store) => {
  it("uses the storefront's page, raised surface and text", () => {
    expect(admin.neutral[50]).toBe(store.bg);
    expect(admin.surface).toBe(store.bgRaised);
    expect(admin.neutral[900]).toBe(store.text);
  });

  it("uses the storefront's primary button: its fill, its pressed shade and its label", () => {
    expect(admin.accent.DEFAULT).toBe(store.accent);
    expect(admin.accent.hover).toBe(store.accentHover);
    expect(admin.onAccent).toBe(store.onAccent);
  });

  it('reads as text on the page with the same steps the storefront uses for secondary text', () => {
    expect(admin.neutral[500]).toBe(store.textFaint);
    expect(admin.neutral[600]).toBe(store.textMuted);
    expect(admin.neutral[700]).toBe(store.textBody);
  });
});

describe('the back office shape and type', () => {
  it('has square corners, like the storefront', () => {
    expect(BRAND.theme.radii.sharp).toBe(0);
    expect(BRAND.theme.radii.lg).toBe(0);
  });

  it("sets body in the storefront's sans, headlines in its serif and the logotype in its logo face", () => {
    const { fonts } = BRAND.storefront;
    expect(BRAND.theme.fonts.sansStack[0]).toBe(fonts.sans.family);
    expect(BRAND.theme.fonts.serifStack[0]).toBe(fonts.serif.family);
    expect(BRAND.theme.fonts.logoStack[0]).toBe(fonts.logo.family);
  });

  it('opens in the storefront theme, which is light', () => {
    expect(BRAND.storefront.defaultTheme).toBe('light');
  });

  it('keeps the storefront accent legible as ink on the page in both themes', () => {
    expect(contrastRatioHex(BRAND.theme.colors.accent.DEFAULT, BRAND.theme.colors.neutral[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatioHex(BRAND.theme.colorsDark.accentInk.DEFAULT, BRAND.theme.colorsDark.neutral[50])).toBeGreaterThanOrEqual(4.5);
  });
});
