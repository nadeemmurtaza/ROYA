/**
 * Overflow sweep: every storefront page at the seven widths the design names,
 * in both themes and both languages, reporting any horizontal overflow and the
 * elements that cause it. A page that scrolls sideways at 280px is a page a
 * client cannot read.
 *
 *   node e2e/sweep.mjs                      # everything
 *   SHOTS=./shots node e2e/sweep.mjs        # also save a screenshot of every combination
 *   WIDTHS=280,380 LOCALES=ar node e2e/sweep.mjs
 *
 * Needs the stack running: the API on API_URL (through the storefront's /api/v1
 * proxy) and the storefront on BASE_URL, with the seeded catalogue.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const WIDTHS = (process.env.WIDTHS ?? '280,380,640,768,1024,1280,1536').split(',').map(Number);
const THEMES = (process.env.THEMES ?? 'dark,light').split(',');
const LOCALES = (process.env.LOCALES ?? 'en,ar').split(',');
const SHOTS = process.env.SHOTS;
const CHROMIUM = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

const ROUTES = [
  { name: 'home', path: '' },
  { name: 'collection', path: '/collection' },
  { name: 'product-bespoke', path: '/product/mehr' },
  { name: 'product-ready', path: '/product/noir' },
  { name: 'bag', path: '/bag', needsCart: true },
  { name: 'checkout', path: '/checkout', needsCart: true },
  { name: 'account', path: '/account' },
  { name: 'consultation', path: '/consultation' },
  { name: 'help', path: '/help/delivery' },
  { name: 'not-found', path: '/no-such-page' },
];

const browser = await chromium.launch({ executablePath: CHROMIUM, args: ['--no-sandbox'] });
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let failures = 0;
let checked = 0;

for (const locale of LOCALES) {
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript((value) => {
        try {
          localStorage.setItem('roya.theme', value);
        } catch {
          /* storage blocked */
        }
      }, theme);

      // A bag with a piece in it, so the pages that need one have something to show.
      const slug = await (await context.request.get(`${BASE}/api/v1/catalog/products?pageSize=1&locale=en`)).json();
      const product = await (await context.request.get(`${BASE}/api/v1/catalog/products/${slug.data[0].slug}`)).json();
      await context.request.post(`${BASE}/api/v1/cart/items`, {
        data: { variantId: product.variants[0].id, quantity: 1 },
      });

      for (const route of ROUTES) {
        const page = await context.newPage();
        await page
          .goto(`${BASE}/${locale}${route.path}`, { waitUntil: 'networkidle', timeout: 60000 })
          .catch(() => undefined);
        await page.waitForTimeout(route.name === 'home' ? 600 : 250);

        const report = await page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          const offenders = [];
          for (const element of document.querySelectorAll('body *')) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            // Content that is clipped on purpose (a scroller, a hidden film) does not count.
            let clipped = false;
            for (
              let parent = element.parentElement;
              parent && parent !== document.body;
              parent = parent.parentElement
            ) {
              const overflow = getComputedStyle(parent).overflowX;
              if (overflow === 'hidden' || overflow === 'auto' || overflow === 'scroll' || overflow === 'clip') {
                clipped = true;
                break;
              }
            }
            if (!clipped && (rect.right > viewport + 1 || rect.left < -1)) {
              offenders.push(
                `${element.tagName.toLowerCase()}.${String(element.className).split(' ')[0]} (${Math.round(rect.left)}..${Math.round(rect.right)})`,
              );
            }
          }
          return { scroll: document.documentElement.scrollWidth, viewport, offenders: offenders.slice(0, 4) };
        });

        checked += 1;
        if (report.scroll > report.viewport + 1 || report.offenders.length > 0) {
          failures += 1;
          console.log(
            `OVERFLOW  ${locale} ${theme} ${width}px  ${route.name}  scroll=${report.scroll} viewport=${report.viewport}  ${report.offenders.join(', ')}`,
          );
        }
        if (SHOTS)
          await page.screenshot({ path: `${SHOTS}/${route.name}-${locale}-${theme}-${width}.png`, fullPage: true });
        await page.close();
      }
      await context.close();
    }
  }
}

await browser.close();
console.log(`${checked} page views checked, ${failures} with horizontal overflow`);
process.exit(failures === 0 ? 0 : 1);
