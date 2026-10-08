'use client';

import type { ReactNode } from 'react';
import { useCssVars } from '@/lib/dynamic-style';
import { CHART_DRAW_MS, pointPopVars } from './chart-motion';

/**
 * A mark that pops in as the line reaches it: a `.chart-point` group whose delay
 * (`--pop-delay`) is its place along the line. The delay is computed, so it
 * rides on a rule in the dynamic stylesheet (`lib/dynamic-style.ts`) and the
 * group carries no style attribute. One group per mark, so each pops on its own
 * centre (`transform-box: fill-box`) instead of walking as a shared one grows.
 */
export function PopGroup({
  index,
  count,
  seriesIndex = 0,
  drawMs = CHART_DRAW_MS,
  children,
}: {
  index: number;
  count: number;
  seriesIndex?: number;
  drawMs?: number;
  children: ReactNode;
}) {
  const ref = useCssVars<SVGGElement>(pointPopVars(index, count, drawMs, seriesIndex));
  return (
    <g ref={ref} className="chart-point">
      {children}
    </g>
  );
}
