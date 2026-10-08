/**
 * The back office in a real browser: sign in, add a supplier, a raw material, an
 * expense and a draft product with an Arabic name, then look at the pages that
 * hold them at the widest and the narrowest screen. Needs the stack running
 * (API :3001, back office :3002) and a seeded database.
 *
 *   node apps/admin/e2e/admin.mjs
 *
 * It creates records (named "E2E <stamp>") and leaves them: the product is a
 * Draft, so nothing reaches the storefront.
 */
import { check, open, overflowOf } from '../../storefront/e2e/lib.mjs';

const BASE = process.env.ADMIN_URL ?? 'http://localhost:3002';
const EMAIL = process.env.ADMIN_EMAIL ?? 'admin@roya.example';
const PASSWORD = process.env.ADMIN_PASSWORD ?? 'admin12345';
const stamp = Date.now().toString(36);

/** Console noise that is the engine answering "no" on purpose: an order with no instalment plan is a 404 the page hides. */
const EXPECTED_NOISE = /Failed to load resource.*404/;

const { browser, context, page, errors } = await open({ width: 1280, height: 900 });
page.setDefaultTimeout(10_000);
const failedCalls = [];
page.on('response', (response) => {
  const url = response.url();
  if (url.includes('/api/v1/') && response.status() >= 400 && !url.includes('/instalments')) {
    failedCalls.push(`${response.status()} ${response.request().method()} ${url.replace(BASE, '')}`);
  }
});

async function visit(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
}

try {
  // --- sign in --------------------------------------------------------------
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'load' });
  await page.locator('input').nth(0).fill(EMAIL);
  await page.locator('input').nth(1).fill(PASSWORD);
  await Promise.all([page.waitForURL((url) => !url.pathname.includes('/login')), page.click('button[type=submit]')]);
  await page.waitForTimeout(1500);
  check(page.url().startsWith(`${BASE}/admin`), 'signs in and lands in the back office');

  // --- the sidebar only offers what is shipped -------------------------------
  const hrefs = await page.locator('aside a, nav a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
  check(hrefs.includes('/admin/suppliers'), 'the sidebar links to suppliers');
  const unshipped = ['/admin/wallet', '/admin/transfers', '/admin/payroll/runs', '/admin/o', '/admin/finance', '/admin/accounting/fiscal-periods'];
  check(
    unshipped.every((href) => !hrefs.includes(href)),
    'the sidebar offers no page for a module this deployment does not run (or the ledger while it is off)',
  );

  // --- the ledger pages say what they need ----------------------------------
  await visit('/admin/finance');
  check(await page.getByText('reads the general ledger').isVisible(), 'Profit & loss explains that it needs the ledger, instead of failing');
  failedCalls.length = 0;

  // --- a supplier -----------------------------------------------------------
  await visit('/admin/suppliers');
  await page.getByRole('button', { name: 'New supplier' }).click();
  await page.getByLabel('Name', { exact: true }).fill(`E2E Fabrics ${stamp}`);
  await page.getByLabel('Email').fill('buyer@e2e-fabrics.example');
  await page.getByLabel('City').fill('Dubai');
  await page.getByRole('button', { name: 'Add supplier' }).click();
  await page.waitForURL(/\/admin\/suppliers\/[^/]+$/);
  await page.waitForTimeout(800);
  check(await page.getByText(`E2E Fabrics ${stamp}`).first().isVisible(), 'a new supplier is saved and opens on its own page');

  // --- a raw material ------------------------------------------------------
  await visit('/admin/bom/raw-materials');
  await page.getByRole('button', { name: 'Add raw material' }).first().click();
  const materialForm = page.locator('main form').first();
  await materialForm.getByLabel('Name', { exact: true }).fill(`E2E Silk ${stamp}`);
  check((await materialForm.locator('select').nth(1).inputValue()) === 'METRE', 'a raw material is measured in metres by default');
  await materialForm.getByRole('button', { name: 'Add raw material' }).click();
  await page.waitForTimeout(1500);
  check(await page.getByText(`E2E Silk ${stamp}`).first().isVisible(), 'a new raw material appears in the list');

  // --- an expense, in the brand's currency -----------------------------------
  await visit('/admin/finance/expenses');
  await page.getByRole('button', { name: 'Record expense' }).click();
  const expenseForm = page.locator('main form').first();
  await expenseForm.getByLabel('Category').selectOption({ label: 'Rent' });
  await expenseForm.getByLabel(/^Amount/).fill('1500');
  await expenseForm.getByLabel('Description').fill(`E2E rent ${stamp}`);
  // The date box reads what a person types ("5 Oct"), and commits on leaving it.
  await expenseForm.locator('#expense-incurred').fill('5 Oct 2026');
  await expenseForm.getByLabel(/^Payee/).click();
  await expenseForm.locator('button[type=submit]').click();
  await page.waitForTimeout(1500);
  const expenseRow = page.getByText(`E2E rent ${stamp}`).first();
  check(await expenseRow.isVisible(), 'a new expense appears in the list');
  const rowText = await expenseRow.locator('xpath=ancestor::tr').innerText();
  check(/AED/.test(rowText) && /1,500/.test(rowText), `the expense is shown in dirhams (${rowText.replace(/\s+/g, ' ').slice(0, 80)})`);

  // --- a draft product with an Arabic name -----------------------------------
  await visit('/admin/products/new');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel(/^Name/).first().fill(`E2E Gown ${stamp}`);
  await page.getByLabel(/^Name/).nth(1).fill('فستان تجريبي');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByLabel(/^Price/).first().fill('2500');
  for (let step = 0; step < 6; step += 1) await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Create product' }).click();
  await page.waitForURL(/\/admin\/products(\/[^/]+)?$/, { timeout: 20_000 });
  await visit('/admin/products');
  check(await page.getByText(`E2E Gown ${stamp}`).first().isVisible(), 'a new product is created and listed');

  // --- no failed call, no console error, along the way --------------------------
  check(failedCalls.length === 0, `no API call failed while using the pages${failedCalls.length ? `: ${failedCalls.join(' | ')}` : ''}`);
  const real = errors.filter((message) => !EXPECTED_NOISE.test(message));
  check(real.length === 0, `no console errors${real.length ? `: ${real.join(' | ')}` : ''}`);

  // --- the narrowest screen ----------------------------------------------------
  await page.setViewportSize({ width: 280, height: 700 });
  for (const path of [
    '/admin',
    '/admin/launchpad',
    '/admin/suppliers',
    '/admin/products/new',
    '/admin/inventory',
    '/admin/categories',
    '/admin/finance/expenses',
    '/admin/bom/raw-materials',
    '/admin/purchase-orders/new',
  ]) {
    await visit(path);
    const { scroll, viewport, offenders } = await overflowOf(page);
    check(scroll <= viewport, `${path} fits 280px (${scroll} of ${viewport}${offenders.length ? `, past the edge: ${offenders.join(', ')}` : ''})`);
  }
} catch (failure) {
  console.error(`FAIL  ${failure.message}`);
  process.exitCode = 1;
} finally {
  await context.close();
  await browser.close();
}
