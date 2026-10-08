/**
 * The page behind an open dialog or drawer does not scroll.
 *
 * It used to be `document.body.style.overflow = 'hidden'`, with each caller
 * saving and restoring what it found. A class on <body> (`.scroll-locked` in
 * globals.css) keeps the CSS in the stylesheet, and a count keeps the lock
 * honest when two things hold it at once: a dialog opened from inside the
 * mobile drawer must not free the page when the dialog closes first.
 */
export function createScrollLock(apply: (locked: boolean) => void): () => () => void {
  let holders = 0;
  return () => {
    holders += 1;
    if (holders === 1) apply(true);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      holders -= 1;
      if (holders === 0) apply(false);
    };
  };
}

/** Take the lock; call the returned function to give it back (idempotent). */
export const lockScroll = createScrollLock((locked) => {
  if (typeof document !== 'undefined') document.body.classList.toggle('scroll-locked', locked);
});
