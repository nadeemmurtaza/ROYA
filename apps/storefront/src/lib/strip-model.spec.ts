import { STRIP_REACH, stripPlace, stripSnaps, wrapOffset } from './strip-model';

describe('wrapOffset', () => {
  it('folds six slides to -3..2 around the active one', () => {
    expect([0, 1, 2, 3, 4, 5].map((index) => wrapOffset(index, 6))).toEqual([0, 1, 2, -3, -2, -1]);
  });

  it('follows the active slide round the end', () => {
    expect([0, 1, 2, 3, 4, 5].map((index) => wrapOffset(index - 5, 6))).toEqual([1, 2, -3, -2, -1, 0]);
  });

  it('is zero for the active slide whatever the count', () => {
    for (const count of [1, 2, 3, 7, 12]) expect(wrapOffset(0, count)).toBe(0);
  });
});

describe('stripPlace', () => {
  it('keeps the places the stylesheet draws as they are', () => {
    expect([-3, -2, -1, 0, 1, 2, 3].map(stripPlace)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
  });

  it('holds a farther card at the third place, so every offset has a rule', () => {
    expect(stripPlace(5)).toBe(STRIP_REACH);
    expect(stripPlace(-9)).toBe(-STRIP_REACH);
  });
});

describe('stripSnaps', () => {
  it('lets a card that moved one place sweep', () => {
    expect(stripSnaps(1, 0)).toBe(false);
    expect(stripSnaps(-2, -3)).toBe(false);
    expect(stripSnaps(0, 0)).toBe(false);
  });

  it('snaps a card that wrapped round the back', () => {
    expect(stripSnaps(-3, 2)).toBe(true);
    expect(stripSnaps(2, -3)).toBe(true);
  });
});
