import { chromium } from 'playwright';

export const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
export const CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

/** A browser page that remembers every console error and uncaught exception, so a flow fails on them, not only on what it clicks. */
export async function open({ width = 1280, height = 900 } = {}) {
  const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text().slice(0, 200)}`);
  });
  return { browser, context, page, errors };
}

export function check(condition, message) {
  if (!condition) {
    console.error(`FAIL  ${message}`);
    process.exitCode = 1;
  } else {
    console.log(`ok    ${message}`);
  }
}
