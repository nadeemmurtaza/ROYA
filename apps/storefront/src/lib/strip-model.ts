/**
 * Where each card of the signature strip stands, as plain numbers.
 *
 * The strip's cards are laid out by the stylesheet (`.scard[data-offset]` in
 * styles/home.css), so a component only says which place a card is in; it never
 * writes a transform of its own.
 */

/** The farthest place the stylesheet draws: three cards out, either side of the active one. */
export const STRIP_REACH = 3;

/** An offset from the active slide, folded so the strip wraps the short way round: -3..2 for six slides. */
export function wrapOffset(distance: number, count: number): number {
  const half = Math.floor(count / 2);
  return ((((distance + half) % count) + count) % count) - half;
}

/**
 * The `data-offset` of a card: its offset, held to the reach. Past the third
 * place a card is out of sight anyway, so every further one shares it.
 */
export function stripPlace(offset: number): number {
  return Math.max(-STRIP_REACH, Math.min(STRIP_REACH, offset));
}

/**
 * A card that wraps round the back jumps instead of sweeping across the front:
 * it moved more than one place, so it should not animate there.
 */
export function stripSnaps(offset: number, wasOffset: number): boolean {
  return Math.abs(offset - wasOffset) > 1;
}
