/**
 * The atelier desk, as staff use it, in a real browser: who is let in, then one
 * order taken from "new" to "delivered" (payment confirmed, production, ready,
 * dispatched with tracking, delivered), a second one cancelled and refunded, a
 * consultation request followed up, and a look at every desk page at three
 * widths in both languages for horizontal overflow.
 *
 *   node e2e/desk.mjs
 *
 * Needs the stack running and the seeded database (the demo staff and client
 * accounts). It places real orders and changes real leads in whatever database
 * the API is pointed at: never run it against production.
 */
import { execFileSync } from 'node:child_process';
import { BASE, check, open, overflowOf } from './lib.mjs';

const STAFF = [process.env.STAFF_EMAIL ?? 'staff@roya.example', process.env.STAFF_PASSWORD ?? 'staff12345'];
const CLIENT = [process.env.DEMO_EMAIL ?? 'mariam@example.com', process.env.DEMO_PASSWORD ?? 'customer12345'];
const base = `${BASE}/en`;

/** Places a guest order through the real checkout and returns its number. */
function placeOrder() {
  const output = execFileSync('node', [new URL('./purchase.mjs', import.meta.url).pathname, 'en'], {
    encoding: 'utf8',
    timeout: 180000,
  });
  const number = /numbered (RY-\d{4}-\d{4})/.exec(output)?.[1];
  if (!number) throw new Error(`purchase.mjs did not report an order number:\n${output}`);
  return number;
}

async function signIn(page, [identifier, password], next = '') {
  await page.goto(`${base}/account${next ? `?next=${next}` : ''}`, { waitUntil: 'networkidle' });
  await page.fill('#a-identifier', identifier);
  await page.fill('#a-password', password);
  await page.locator('.auth-form button[type=submit]').click();
}

const first = placeOrder();
const second = placeOrder();
console.log(`placed ${first} and ${second}`);

// ── Who is let in ────────────────────────────────────────────────────────────
{
  const { browser, page } = await open();
  await page.goto(`${base}/desk`, { waitUntil: 'networkidle' });
  await page.waitForURL('**/account**', { timeout: 20000 });
  check(
    page.url().includes('next=%2Fdesk') || page.url().includes('next=/desk'),
    'a visitor who is not signed in is sent to sign in, and brought back',
  );

  await page.goto(`${base}/account`, { waitUntil: 'networkidle' });
  await page.fill('#a-identifier', CLIENT[0]);
  await page.fill('#a-password', CLIENT[1]);
  await page.locator('.auth-form button[type=submit]').click();
  await page.waitForURL('**/dashboard', { timeout: 30000, waitUntil: 'commit' });
  check((await page.getByRole('link', { name: /atelier desk/i }).count()) === 0, 'a client is not offered the desk');
  await page.goto(`${base}/desk`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /for the atelier team/i }).waitFor({ timeout: 15000 });
  check(true, 'a signed-in client who opens the desk is told it is for the atelier team');
  await browser.close();
}

const { browser, page, errors } = await open();

// ── Staff land on the desk ───────────────────────────────────────────────────
await signIn(page, STAFF);
await page.waitForURL('**/desk', { timeout: 20000 });
check(true, 'staff who sign in without being sent anywhere land on the desk');
await page.getByRole('heading', { name: 'Orders', exact: true }).waitFor();
await page.waitForSelector('.desk-row', { timeout: 15000 });
check((await page.locator('.desk-badge').count()) >= 1, 'the Payments tab carries a count of what waits');

// ── One order, new to delivered ──────────────────────────────────────────────
await page.fill('#desk-q', first);
await page.keyboard.press('Enter');
await page.waitForFunction(
  (n) => document.querySelectorAll('.desk-row').length === 1 && document.body.innerText.includes(n),
  first,
  {
    timeout: 15000,
  },
);
check(true, `searching for ${first} finds exactly that order`);
await page.locator('.desk-row .desk-number').click();
await page.waitForURL('**/desk/orders/**');
await page.getByRole('heading', { name: first }).waitFor();
const pill = async () => (await page.locator('.desk-card').first().locator('.desk-pill').first().innerText()).trim();
check((await pill()).toLowerCase() === 'new', 'a fresh order is "New"');

await page.getByRole('button', { name: 'Confirm payment received' }).click();
const prompt = await page.locator('.desk-confirm').innerText();
check(
  /AED [\d,]+/.test(prompt) && prompt.includes('BT-'),
  'confirming a payment names the amount and the reference first',
);
await page.getByRole('button', { name: 'Confirm payment', exact: true }).click();
await page.getByText('Payment confirmed.').waitFor({ timeout: 15000 });
await page.waitForFunction(
  () => document.querySelector('.desk-card .desk-pill')?.textContent?.trim().toLowerCase() === 'confirmed',
  null,
  { timeout: 15000 },
);
check(true, 'confirming the payment confirms the order');

for (const [button, becomes] of [
  ['Start production', 'in production'],
  ['Mark ready to ship', 'ready to ship'],
]) {
  await page.getByRole('button', { name: button }).click();
  await page.waitForFunction(
    (word) => document.querySelector('.desk-card .desk-pill')?.textContent?.trim().toLowerCase() === word,
    becomes,
    { timeout: 15000 },
  );
  check(true, `"${button}" moves the order to ${becomes}`);
}

await page.fill('#desk-courier', 'Aramex');
await page.fill('#desk-tracking', 'TRK-123456');
await page.getByRole('button', { name: 'Mark shipped' }).click();
await page.waitForFunction(
  () => document.querySelector('.desk-card .desk-pill')?.textContent?.trim().toLowerCase() === 'shipped',
  null,
  { timeout: 25000 },
);
check(
  (await page.locator('.desk-side').innerText()).includes('TRK-123456'),
  'dispatching records the courier and tracking, and the order is shipped',
);

await page.getByRole('button', { name: 'Mark delivered' }).click();
await page.waitForFunction(
  () => document.querySelector('.desk-card .desk-pill')?.textContent?.trim().toLowerCase() === 'delivered',
  null,
  { timeout: 15000 },
);
check(
  (await page.locator('section[aria-labelledby="d-history"]').innerText()).toLowerCase().includes('confirmed'),
  'the order is delivered, and its history shows the confirmation',
);

// ── A second order: cancelled, and the payment refunded ──────────────────────
await page.goto(`${base}/desk?q=${second}`, { waitUntil: 'networkidle' });
await page.locator('.desk-row .desk-number').first().click();
await page.getByRole('heading', { name: second }).waitFor();
await page.getByRole('button', { name: 'Confirm payment received' }).click();
await page.getByRole('button', { name: 'Confirm payment', exact: true }).click();
await page.getByText('Payment confirmed.').waitFor({ timeout: 15000 });
await page.getByRole('button', { name: 'Cancel order' }).click();
check(
  (await page.locator('.desk-confirm').innerText()).includes('Record the refund'),
  'cancelling a paid order says the refund is still to record',
);
await page.fill('#desk-leave-reason', 'Client changed her mind');
await page.locator('.desk-confirm').getByRole('button', { name: 'Cancel order' }).click();
await page.waitForFunction(
  () => document.querySelector('.desk-card .desk-pill')?.textContent?.trim().toLowerCase() === 'cancelled',
  null,
  { timeout: 15000 },
);
check(
  (await page.locator('.desk-card').first().innerText()).includes('Client changed her mind'),
  'a cancelled order keeps its reason',
);
await page.getByRole('button', { name: 'Record refund' }).click();
await page.locator('.desk-confirm').getByRole('button', { name: 'Record refund' }).click();
await page.getByText('Refund recorded.').waitFor({ timeout: 15000 });
check(
  (await page.locator('section[aria-labelledby="d-pay"]').innerText()).toLowerCase().includes('refunded'),
  'the refund is recorded against the payment',
);

// ── A request, followed up ───────────────────────────────────────────────────
const who = `Desk Test ${Date.now()}`;
await page.request.post(`${BASE}/api/v1/crm/enquiries`, {
  data: {
    name: who,
    phone: '+971501112233',
    message:
      'Consultation request: home\nPreferred: 2026-11-02, morning\nWhere: Villa 4, Jumeirah\nA wedding in March.',
    source: 'consultation-home',
  },
});
await page.getByRole('link', { name: /^Requests/ }).click();
await page.getByRole('heading', { name: 'Requests' }).waitFor();
const card = page.locator('.desk-card', { hasText: who });
await card.waitFor({ timeout: 15000 });
check(
  (await card.innerText()).includes('At home') && (await card.innerText()).includes('Villa 4, Jumeirah'),
  'a consultation request shows what the client asked for',
);
await card.getByLabel('Status').selectOption('CONTACTED');
await card.waitFor({ state: 'detached', timeout: 15000 });
await page.getByRole('button', { name: 'Contacted' }).first().click();
await page.locator('.desk-card', { hasText: who }).waitFor({ timeout: 15000 });
check(true, 'a followed-up request leaves "New" and appears under "Contacted"');

// ── Overflow, every desk page, three widths, both languages ──────────────────
let overflowing = 0;
for (const locale of ['en', 'ar']) {
  for (const width of [280, 640, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/desk', '/desk/payments', '/desk/requests', `/desk?q=${first}`]) {
      await page.goto(`${BASE}/${locale}${path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      if (path.startsWith('/desk?q=')) {
        const link = page.locator('.desk-row .desk-number').first();
        if (await link.count()) {
          await link.click();
          await page.waitForSelector('.desk-split', { timeout: 15000 });
          await page.waitForTimeout(300);
        }
      }
      const report = await overflowOf(page);
      if (report.scroll > report.viewport + 1 || report.offenders.length > 0) {
        overflowing += 1;
        console.error(
          `OVERFLOW  ${locale} ${width}px ${page.url()}  scroll=${report.scroll} viewport=${report.viewport}  ${report.offenders.join(', ')}`,
        );
      }
    }
  }
}
check(overflowing === 0, 'no desk page scrolls sideways at 280, 640 or 1280px in English or Arabic');

check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
await browser.close();
