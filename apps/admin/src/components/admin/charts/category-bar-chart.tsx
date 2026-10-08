'use client';

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoney, formatNumber } from '@newax/shared';
import { EmptyState } from '@/components/ui';
import { ChartDataTable } from './chart-data-table';
import { chartCursor, chartDrawProps, chartTooltipMotion } from './chart-motion';
import { ChartTooltip } from './chart-tooltip';
import { usePrefersReducedMotion } from './use-reduced-motion';
import { GRID, INK, INK_FAINT, compactMoney, paletteColor, type ValueFormat } from './chart-theme';

export interface CategoryBarItem {
  label: string;
  value: number;
}

/** A ranked horizontal bar list — top sellers, categories, suppliers. */
export function CategoryBarChart({
  items,
  format = 'integer',
  height,
}: {
  items: readonly CategoryBarItem[];
  format?: ValueFormat;
  height?: number;
}) {
  const reduced = usePrefersReducedMotion();

  if (items.length === 0) {
    return <EmptyState title="No data in this window." />;
  }

  const formatValue = (value: number) =>
    format === 'money' ? formatMoney(value) : format === 'percent' ? `${value}%` : formatNumber(value);

  const ariaLabel = `${items.length} categories ranked by value`;
  const rowHeight = 32;

  return (
    <figure className="m-0" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height ?? Math.max(160, items.length * rowHeight)}>
        <BarChart
          data={items as CategoryBarItem[]}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
        >
          <CartesianGrid stroke={GRID} horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(value: number) => (format === 'money' ? compactMoney(value) : formatNumber(value))}
            tick={{ fontSize: 11, fill: INK_FAINT }}
            tickLine={false}
            axisLine={{ stroke: GRID }}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={140}
            tick={{ fontSize: 12, fill: INK }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            {...chartTooltipMotion(reduced)}
            cursor={chartCursor.band}
            content={(props) => (
              <ChartTooltip
                active={props.active}
                payload={props.payload}
                label={props.label}
                formatValue={formatValue}
              />
            )}
          />
          <Bar dataKey="value" radius={[0, 2, 2, 0]} {...chartDrawProps(reduced)}>
            {items.map((item, index) => (
              <Cell key={item.label} fill={paletteColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <ChartDataTable
        caption={ariaLabel}
        columns={['Category', 'Value']}
        rows={items.map((item) => [item.label, formatValue(item.value)])}
      />
    </figure>
  );
}
