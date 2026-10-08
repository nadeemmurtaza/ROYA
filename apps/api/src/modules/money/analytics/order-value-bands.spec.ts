import { BRAND, formatMoney, toMinor } from '@newax/shared';
import { orderValueBands } from './order-value-bands';

describe('orderValueBands', () => {
  it('cuts the brand edges into one more band than there are edges, labelled in the shop currency', () => {
    const { edges, labels } = orderValueBands([1_500, 5_000, 15_000]);
    expect(edges).toEqual([toMinor(1_500), toMinor(5_000), toMinor(15_000)]);
    expect(labels).toEqual([
      `< ${formatMoney(toMinor(1_500))}`,
      `${formatMoney(toMinor(1_500))}\u2013${formatMoney(toMinor(5_000))}`,
      `${formatMoney(toMinor(5_000))}\u2013${formatMoney(toMinor(15_000))}`,
      `${formatMoney(toMinor(15_000))}+`,
    ]);
  });

  it('names the shop currency, never another one', () => {
    const { labels } = orderValueBands(BRAND.commerce.orderValueBandEdges);
    for (const label of labels) {
      expect(label).toContain(BRAND.locale.currency);
      expect(label).not.toMatch(/\bRs\b/);
    }
  });

  it('yields no bands when there are no edges', () => {
    expect(orderValueBands([])).toEqual({ edges: [], labels: [] });
  });

  it('keeps the brand edges ascending, or the bands would overlap', () => {
    const edges = BRAND.commerce.orderValueBandEdges;
    expect(edges.length).toBeGreaterThan(0);
    expect([...edges].sort((a, b) => a - b)).toEqual([...edges]);
  });
});
