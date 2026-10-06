/**
 * Buying while signing in, the case that loses a bag if it is wrong: a guest
 * fills the bag, signs in at checkout, the bag survives (it is folded into the
 * account's), the form is pre-filled, and the placed order appears in the
 * account's order history (it carries the client's token, not a guest's).
 * Uses the development demo account and places a real order.
 *
 *   node e2e/signed-in.mjs
 */
import { BASE, check, open } from './lib.mjs';

const { browser, page, errors } = await open();
const base = `${BASE}/en`;

await page.goto(`${base}/product/noir`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /add to bag/i }).click();
await page.waitForURL('**/bag');
await page.waitForSelector('.bag-line');

await page.goto(`${base}/account?next=/checkout`, { waitUntil: 'networkidle' });
await page.fill('#a-identifier', process.env.DEMO_EMAIL ?? 'mariam@example.com');
await page.fill('#a-password', process.env.DEMO_PASSWORD ?? 'customer12345');
await page.locator('.auth-form button[type=submit]').click();
await page.waitForURL('**/checkout', { timeout: 20000 });
await page.waitForSelector('#d-email');
await page.waitForFunction(() => document.querySelector('#d-line1')?.value !== '', null, { timeout: 15000 });
check((await page.inputValue('#d-email')).includes('@'), 'signing in pre-fills the checkout form');
check((await page.locator('.aside-lines li').count()) === 1, 'the guest bag survives signing in');

await page.waitForSelector('.opt-row');
await page.locator('.pane-actions .btn-gold').click();
await page.locator('.pane-actions .btn-gold').click();
await page.locator('.terms input').check();
await page.locator('.pane-actions .btn-gold').click();
await page.waitForURL('**/orders/**', { timeout: 30000 });
const number = decodeURIComponent(page.url().split('/').pop());

await page.goto(`${base}/dashboard?tab=orders`, { waitUntil: 'networkidle' });
await page.waitForSelector('.order-row', { timeout: 15000 });
const listed = await page.locator('.order-row').allInnerTexts();
check(
  listed.some((row) => row.includes(number)),
  `${number} is in the signed-in client's order history`,
);
check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

await browser.close();
