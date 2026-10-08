import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '@/constants/routes';
import { ADMIN_NAV, navFor } from './nav-registry';

const APP_DIR = path.resolve(__dirname, '../../app');

/** Every URL pattern the app serves a page for, as segment lists: route groups drop out, `[x]` and `[...x]` stay as wildcards. */
function pageRoutes(dir = APP_DIR, segments: string[] = []): string[][] {
  const found: string[][] = existsSync(path.join(dir, 'page.tsx')) ? [segments] : [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const isGroup = entry.name.startsWith('(') && entry.name.endsWith(')');
    found.push(...pageRoutes(path.join(dir, entry.name), isGroup ? segments : [...segments, entry.name]));
  }
  return found;
}

function servedBy(href: string, route: string[]): boolean {
  const parts = href.split('?')[0]!.split('/').filter(Boolean);
  for (let index = 0; index < route.length; index += 1) {
    const segment = route[index]!;
    if (segment.startsWith('[...')) return parts.length > index;
    if (index >= parts.length) return false;
    if (!segment.startsWith('[') && segment !== parts[index]) return false;
  }
  return parts.length === route.length;
}

describe('the admin nav registry against the pages this app has', () => {
  const routes = pageRoutes();
  const entries = ADMIN_NAV.flatMap((item) => [item, ...(item.children ?? [])]);

  it('finds the pages to check against', () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it('links only to a page that exists (a nav entry for a module this deployment does not ship is a dead end)', () => {
    const dead = entries.filter((entry) => !routes.some((route) => servedBy(entry.href, route))).map((entry) => entry.href);
    expect(dead).toEqual([]);
  });

  it('keeps no route constant for a page that does not exist', () => {
    const dead = Object.entries(ROUTES.admin)
      .map(([name, route]) => [name, typeof route === 'function' ? (route as (...args: string[]) => string)('x', 'x') : route] as const)
      .filter(([, href]) => !routes.some((page) => servedBy(href, page)))
      .map(([name]) => name);
    expect(dead).toEqual([]);
  });

  it('hides the ledger views while the accounting module is off, and shows them when it is on', () => {
    const keys = (modules: string[]) => navFor(['finance.view', 'accounting.view'], modules).map((item) => item.key);
    for (const key of ['finance-pnl', 'finance-cash-flow', 'fiscal-periods']) {
      expect(keys(['finance'])).not.toContain(key);
      expect(keys(['finance', 'accounting'])).toContain(key);
    }
  });
});
