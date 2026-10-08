import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND } from '@newax/shared';
import { staggerDelayMs, staggerStep } from './motion';

/**
 * Components do not write CSS; they set a class, a `data-*` hook or a custom
 * property, and `globals.css` answers it. These hooks are the contract: a
 * component that sets one the stylesheet does not define would do nothing, and
 * nothing would say so.
 */
const css = readFileSync(join(import.meta.dirname, '..', 'app', 'globals.css'), 'utf8').replace(/\s+/g, ' ');

describe('the hooks the components set', () => {
  it('answers every place of the stagger ramp: data-stagger 1 to stagger.steps', () => {
    for (let place = 1; place <= BRAND.theme.motion.stagger.steps; place += 1) {
      expect(css).toContain(`[data-stagger='${place}'] { --stagger: ${place}; }`);
    }
  });

  it('puts the ramp in one place: the step a component names times the token step is the delay', () => {
    for (const index of [0, 1, 2, 3, 4, 5, 40]) {
      expect(staggerStep(index) * BRAND.theme.motion.stagger.step).toBe(staggerDelayMs(index));
    }
    expect(staggerStep(-2)).toBe(0);
    expect(staggerStep(99)).toBe(BRAND.theme.motion.stagger.steps);
  });

  it('answers every digit a count-up strip can show, and the snap that moves it without rolling', () => {
    for (let digit = 1; digit <= 9; digit += 1) {
      expect(css).toContain(`.reel-strip[data-d='${digit}'] { --d: ${digit}; }`);
    }
    expect(css).toContain('.reel-strip[data-snap] { transition: none; }');
  });

  it('reads the stagger place, not a delay a component computed', () => {
    expect(css).toContain("[data-reveal='shown'] { animation: arrive");
    expect(css).toContain('calc(var(--stagger, 0) * var(--motion-stagger-step))');
    expect(css).not.toContain('--reveal-delay');
    expect(css).not.toContain('--reel-delay');
    expect(css).not.toContain('--draw-index');
  });

  it('has the page scroll lock, the copy scratch field and the image reset', () => {
    expect(css).toContain('.scroll-locked { overflow: hidden; }');
    expect(css).toContain('.copy-shim {');
    expect(css).toContain("img[data-nimg='fill'] {");
  });
});
