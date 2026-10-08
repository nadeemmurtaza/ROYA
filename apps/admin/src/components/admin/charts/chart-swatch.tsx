/**
 * The key beside a chart's legend entry: a short bar for a line, a square for a
 * bar, a dashed bar for a dashed line.
 *
 * It is an SVG, so the series colour travels as a paint attribute (`fill`,
 * `stroke`), the same way Recharts paints the series itself, and the legend
 * carries no `style`. The colour is a token from `chart-theme.ts`.
 */
export function ChartSwatch({ color, shape = 'bar' }: { color: string; shape?: 'bar' | 'square' | 'dash' }) {
  if (shape === 'dash') {
    return (
      <svg aria-hidden="true" focusable="false" className="inline-block h-0.5 w-4 shrink-0 overflow-visible">
        <line x1="0" y1="1" x2="16" y2="1" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={shape === 'square' ? 'inline-block h-2.5 w-2.5 shrink-0' : 'inline-block h-0.5 w-4 shrink-0'}
    >
      <rect width="100%" height="100%" fill={color} />
    </svg>
  );
}
