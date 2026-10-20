import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORDER_STATUSES } from '@newax/shared';
import {
  ORDER_TRANSITIONS,
  addressLines,
  canConfirm,
  canRefund,
  deskSections,
  forwardStep,
  isOrderStatus,
  mailLink,
  noteLines,
  paymentState,
  phoneLink,
  receiptHref,
  sideSteps,
  whatsappLink,
} from './desk-model';

describe('deskSections', () => {
  it('opens a section only for the permission it is built on', () => {
    expect(deskSections(['orders.manage'])).toEqual(['orders']);
    expect(deskSections(['crm.manage', 'payments.approve'])).toEqual(['payments', 'requests']);
    expect(deskSections(['commissions.manage'])).toEqual(['commissions']);
  });

  it('opens nothing to a client, a seamstress or an anonymous visitor', () => {
    expect(deskSections(['account.change_own_password'])).toEqual([]);
    expect(deskSections(undefined)).toEqual([]);
    expect(deskSections([])).toEqual([]);
  });
});

describe('order transitions', () => {
  it('mirrors the engine’s table (a drifted copy would offer buttons the API refuses)', () => {
    const source = readFileSync(
      join(import.meta.dirname, '../../../api/src/modules/sales/orders/orders.service.ts'),
      'utf8',
    );
    const block = /const ALLOWED_TRANSITIONS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source)?.[1];
    expect(block, 'ALLOWED_TRANSITIONS was not found in orders.service.ts').toBeDefined();
    const engine: Record<string, string[]> = {};
    for (const [, status, next] of block!.matchAll(/(\w+):\s*\[([^\]]*)\]/g)) {
      engine[status!] = [...next!.matchAll(/'(\w+)'/g)].map((match) => match[1]!);
    }
    expect(engine).toEqual(Object.fromEntries(Object.entries(ORDER_TRANSITIONS).map(([k, v]) => [k, [...v]])));
  });

  it('covers every status the engine has', () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort());
  });

  it('leads with the next step of an order’s life', () => {
    expect(forwardStep('PENDING')).toBe('CONFIRMED');
    expect(forwardStep('CONFIRMED')).toBe('PROCESSING');
    expect(forwardStep('PROCESSING')).toBe('READY_TO_SHIP');
    expect(forwardStep('READY_TO_SHIP')).toBe('SHIPPED');
    expect(forwardStep('SHIPPED')).toBe('DELIVERED');
  });

  it('has no next step once an order is delivered, cancelled or returned', () => {
    expect(forwardStep('DELIVERED')).toBeNull();
    expect(forwardStep('CANCELLED')).toBeNull();
    expect(forwardStep('RETURNED')).toBeNull();
  });

  it('keeps cancelling and returning apart from the way forward', () => {
    expect(sideSteps('PENDING')).toEqual(['CANCELLED']);
    expect(sideSteps('READY_TO_SHIP')).toEqual(['CANCELLED']);
    expect(sideSteps('SHIPPED')).toEqual(['RETURNED']);
    expect(sideSteps('DELIVERED')).toEqual(['RETURNED']);
    expect(sideSteps('CANCELLED')).toEqual([]);
  });

  it('recognises a status only by its own name', () => {
    expect(isOrderStatus('PENDING')).toBe(true);
    expect(isOrderStatus('toString')).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });
});

describe('paymentState', () => {
  it('says there is nothing when there is no payment', () => {
    expect(paymentState(undefined)).toBe('none');
    expect(paymentState([])).toBe('none');
  });

  it('separates a receipt to check from a transfer still awaited', () => {
    expect(paymentState([{ status: 'AWAITING_APPROVAL', receiptUrl: 'https://x/r.jpg' }])).toBe('check');
    expect(paymentState([{ status: 'AWAITING_APPROVAL', receiptUrl: null }])).toBe('waiting');
    expect(paymentState([{ status: 'PENDING' }])).toBe('waiting');
  });

  it('lets a paid payment win over an older attempt that failed', () => {
    expect(paymentState([{ status: 'FAILED' }, { status: 'PAID' }])).toBe('paid');
  });

  it('reports a refund, and a payment that did not go through', () => {
    expect(paymentState([{ status: 'REFUNDED' }])).toBe('refunded');
    expect(paymentState([{ status: 'FAILED' }])).toBe('failed');
    expect(paymentState([{ status: 'CANCELLED' }])).toBe('failed');
  });

  it('lets the desk confirm only what waits on a person, and refund only what was paid', () => {
    expect(canConfirm({ status: 'AWAITING_APPROVAL' })).toBe(true);
    expect(canConfirm({ status: 'PAID' })).toBe(false);
    expect(canConfirm({ status: 'PENDING' })).toBe(false);
    expect(canRefund({ status: 'PAID' })).toBe(true);
    expect(canRefund({ status: 'REFUNDED' })).toBe(false);
  });
});

describe('receiptHref', () => {
  it('turns the API’s own file address into a path on the storefront’s origin', () => {
    expect(receiptHref('http://localhost:3001/api/v1/files/payment-receipts/a1.jpg')).toBe(
      '/api/v1/files/payment-receipts/a1.jpg',
    );
  });

  it('leaves a CDN or bucket address alone', () => {
    expect(receiptHref('https://cdn.example/roya/payment-receipts/a1.jpg')).toBe(
      'https://cdn.example/roya/payment-receipts/a1.jpg',
    );
  });

  it('does not throw on something that is not an address', () => {
    expect(receiptHref('not a url')).toBe('not a url');
  });
});

describe('noteLines', () => {
  it('splits the storefront’s labelled lines and keeps the client’s own words whole', () => {
    expect(noteLines('Delivery: white glove\nPresentation: The ROYA box\nPlease call before 6: I am out')).toEqual([
      { label: 'Delivery', value: 'white glove' },
      { label: 'Presentation', value: 'The ROYA box' },
      { label: null, value: 'Please call before 6: I am out' },
    ]);
    expect(noteLines('Leave it with the concierge.')).toEqual([{ label: null, value: 'Leave it with the concierge.' }]);
  });

  it('is empty for no note', () => {
    expect(noteLines(null)).toEqual([]);
    expect(noteLines('  \n ')).toEqual([]);
  });
});

describe('reaching the client', () => {
  it('builds a WhatsApp link from digits alone', () => {
    expect(whatsappLink('+971 50 123 4567')).toBe('https://wa.me/971501234567');
    expect(whatsappLink(null)).toBeNull();
    expect(whatsappLink('123')).toBeNull();
  });

  it('builds a tel: link that keeps the plus', () => {
    expect(phoneLink('+971 50 123 4567')).toBe('tel:+971501234567');
    expect(phoneLink('')).toBeNull();
  });

  it('links an email only when it looks like one', () => {
    expect(mailLink('a@b.co')).toBe('mailto:a@b.co');
    expect(mailLink('nope')).toBeNull();
    expect(mailLink(undefined)).toBeNull();
  });
});

describe('addressLines', () => {
  it('lists the lines a courier reads and says a repeated city once', () => {
    expect(
      addressLines({ fullName: 'Test Client', line1: 'Villa 12, Street 4', city: 'Dubai', province: 'Dubai' }),
    ).toEqual(['Villa 12, Street 4', 'Dubai']);
  });

  it('copes with no address', () => {
    expect(addressLines(null)).toEqual([]);
  });
});
