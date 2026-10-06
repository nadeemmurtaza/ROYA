/**
 * A real purchase, as a guest, in a real browser: the bespoke gown (deposit) into
 * the bag, a presentation choice, three checkout steps, a bank-transfer order,
 * its confirmation. Fails on any console error along the way.
 *
 *   node e2e/purchase.mjs [en|ar] [abroad]
 *
 * `abroad` ships to London with a +44 number: the other zone, the other method.
 * Needs the stack running and the seeded catalogue. It places a real order in
 * whatever database the API is pointed at: never run it against production.
 */
import { BASE, check, open } from './lib.mjs';

const [locale = 'en', abroad = ''] = process.argv.slice(2);
const { browser, page, errors } = await open();
const base = `${BASE}/${locale}`;
const reserve = /reserve with deposit|احجزي بدفعة/i;

await page.goto(`${base}/product/mehr`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: reserve }).click();
await page.waitForURL('**/bag', { timeout: 15000 });
await page.waitForSelector('.bag-line', { timeout: 15000 });
const due = async () => (await page.locator('.due-amount').innerText()).replace(/\s+/g, ' ').trim();
check((await due()).includes('14,250'), `the bag asks for the 50% deposit (${await due()})`);

// The trunk is offered once the catalogue has confirmed it exists, so wait for all three options.
await page.waitForSelector('.opt-card:nth-child(3)', { timeout: 15000 });
await page.locator('.opt-card').nth(1).click();
await page.waitForFunction(() => document.querySelector('.due-amount')?.textContent?.includes('15,450'), null, {
  timeout: 10000,
});
check(true, 'choosing the couture trunk adds its AED 1,200 to the total');
await page.locator('.opt-card').nth(0).click();
await page.waitForFunction(() => document.querySelector('.due-amount')?.textContent?.includes('14,250'), null, {
  timeout: 10000,
});
check(true, 'choosing the box takes it off again');

await page.locator('a.btn-gold[href$="/checkout"]').click();
await page.waitForURL('**/checkout');
await page.fill('#d-email', 'purchase.test@example.com');
await page.fill('#d-fullName', 'Test Client');
if (abroad) {
  await page.fill('#d-phone', '+44 7700 900123');
  await page.selectOption('#d-emirate', 'outside');
  await page.fill('#d-city', 'London');
  await page.fill('#d-country', 'United Kingdom');
  await page.fill('#d-line1', '12 Mount Street, Mayfair');
} else {
  await page.fill('#d-phone', '050 123 4567');
  await page.selectOption('#d-emirate', 'Dubai');
  await page.fill('#d-line1', 'Villa 12, Street 4');
}
await page.waitForSelector('.opt-row', { timeout: 15000 });
const methods = await page.locator('.opt-row').count();
check(methods === (abroad ? 1 : 2), `the engine offers ${methods} delivery method(s) for this destination`);
await page.locator('.pane-actions .btn-gold').click();
await page.waitForSelector('#payment-title');
await page.locator('.pane-actions .btn-gold').click();
await page.waitForSelector('#review-title');
check(
  await page.locator('.pane-actions .btn-gold').isDisabled(),
  'the order cannot be placed before the terms are accepted',
);
await page.locator('.terms input').check();
await page.locator('.pane-actions .btn-gold').click();
await page.waitForURL('**/orders/**', { timeout: 30000 });
const number = decodeURIComponent(page.url().split('/').pop());
check(/^RY-\d{4}-\d{4}$/.test(number), `the order is numbered ${number}`);
await page.waitForSelector('.pay-panel', { timeout: 15000 });
check(true, 'the confirmation shows how to pay and a receipt upload');
check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);

await browser.close();
