import { formatMoney, toMinor } from '@newax/shared';

export interface OrderValueBands {
  /** Upper bound of every band but the last, in minor units, ascending. */
  edges: number[];
  /** One label per band: `edges.length + 1` of them. */
  labels: string[];
}

/**
 * The bands the order-value distribution is cut into, from the brand's own
 * edges (major units), so the chart speaks the shop's currency and scale
 * instead of a fixed one. Labels are the edges formatted as money.
 */
export function orderValueBands(edgesMajor: readonly number[]): OrderValueBands {
  const edges = edgesMajor.map(toMinor);
  const money = edges.map((edge) => formatMoney(edge));
  if (edges.length === 0) return { edges, labels: [] };
  const labels = [`< ${money[0]}`];
  for (let index = 1; index < edges.length; index += 1) labels.push(`${money[index - 1]}\u2013${money[index]}`);
  labels.push(`${money[money.length - 1]}+`);
  return { edges, labels };
}
