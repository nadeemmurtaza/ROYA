import { formatDateShort } from '@newax/shared';

/**
 * A tooltip's heading for a chart whose x axis is a date: "Mon, 5 Oct". Recharts
 * calls the `content` renderer on every render, active or not, and with no
 * hovered point there is no label to format (`formatDateShort('')` throws), so an
 * idle tooltip gets no heading at all.
 */
export function dayLabel(active: boolean | undefined, label: unknown): string | undefined {
  if (!active || label == null || label === '') return undefined;
  return formatDateShort(String(label), 'en', { withWeekday: true });
}
