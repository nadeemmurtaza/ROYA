import { createScrollLock } from './scroll-lock';

describe('scroll lock', () => {
  it('locks on the first holder and frees only when the last lets go', () => {
    const states: boolean[] = [];
    const lock = createScrollLock((locked) => states.push(locked));
    const drawer = lock();
    const dialog = lock();
    expect(states).toEqual([true]);
    dialog();
    expect(states).toEqual([true]);
    drawer();
    expect(states).toEqual([true, false]);
  });

  it('releasing twice does not free a lock someone else still holds', () => {
    const states: boolean[] = [];
    const lock = createScrollLock((locked) => states.push(locked));
    const first = lock();
    const second = lock();
    first();
    first();
    expect(states).toEqual([true]);
    second();
    expect(states).toEqual([true, false]);
  });
});
