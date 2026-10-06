/**
 * The private client's side, in a real browser: the dashboard sends a signed-out
 * visitor to sign in and brings them back; every dashboard tab loads; a
 * consultation request reaches the CRM. Uses the development demo account.
 *
 *   node e2e/account.mjs [en|ar]
 */
import { BASE, check, open } from './lib.mjs';

const locale = process.argv[2] ?? 'en';
const { browser, page, errors } = await open();
const base = `${BASE}/${locale}`;

await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle' });
await page.waitForURL('**/account**', { timeout: 15000 });
check(page.url().includes('next=%2Fdashboard'), 'a signed-out visitor is sent to sign in and remembered');
await page.fill('#a-identifier', process.env.DEMO_EMAIL ?? 'mariam@example.com');
await page.fill('#a-password', process.env.DEMO_PASSWORD ?? 'customer12345');
await page.locator('.auth-form button[type=submit]').click();
await page.waitForURL('**/dashboard', { timeout: 20000 });
await page.waitForSelector('.dash-title');
check(true, 'signing in returns to the dashboard');

for (const tab of ['orders', 'fittings', 'measurements', 'wishlist', 'addresses']) {
  await page.goto(`${base}/dashboard?tab=${tab}`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.dash-title');
  check((await page.locator('.dash-title').innerText()).trim().length > 0, `the ${tab} tab loads`);
}

await page.goto(`${base}/consultation?kind=home`, { waitUntil: 'networkidle' });
await page.fill('#c-name', 'Consultation Test');
await page.fill('#c-phone', '+971 50 765 4321');
await page.selectOption('#c-where', 'Dubai');
await page.locator('.auth-form button[type=submit]').click();
await page.waitForSelector('.consult-done', { timeout: 15000 });
check(true, 'a consultation request is accepted');
check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

await browser.close();
