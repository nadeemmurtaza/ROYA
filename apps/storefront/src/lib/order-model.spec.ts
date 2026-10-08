import type { Order } from '@/types/api';
import { owedTransfer } from './order-model';

const accounts = [{ bank: 'Bank', title: 'ROYA', accountNumber: '1', iban: 'AE07' }];
type Case = Pick<Order, 'status' | 'payments'>;

const awaiting = (extra: Partial<NonNullable<Order['payments']>[number]> = {}): Case => ({
  status: 'PENDING',
  payments: [
    {
      id: 'pay_1',
      provider: 'bank_transfer',
      status: 'AWAITING_APPROVAL',
      receiptUrl: null,
      meta: { accounts },
      ...extra,
    },
  ],
});

describe('owedTransfer', () => {
  it('finds the transfer an unpaid order is still waiting on, with its accounts', () => {
    expect(owedTransfer(awaiting())).toEqual({
      paymentId: 'pay_1',
      redirectUrl: null,
      meta: { accounts },
      receiptSent: false,
    });
  });

  it('says when the receipt is already with the atelier', () => {
    expect(owedTransfer(awaiting({ receiptUrl: '/media/receipts/r.jpg' }))?.receiptSent).toBe(true);
  });

  it('owes nothing once the order has moved past awaiting payment', () => {
    expect(owedTransfer({ ...awaiting(), status: 'CONFIRMED' })).toBeNull();
    expect(owedTransfer({ ...awaiting(), status: 'CANCELLED' })).toBeNull();
  });

  it('owes nothing for a payment that is paid, failed, or not a bank transfer', () => {
    expect(owedTransfer(awaiting({ status: 'PAID' }))).toBeNull();
    expect(owedTransfer(awaiting({ status: 'FAILED' }))).toBeNull();
    expect(owedTransfer(awaiting({ provider: 'cod' }))).toBeNull();
  });

  it('reads the newest payment, which the engine lists first', () => {
    const newest = awaiting({ id: 'pay_2' }).payments![0]!;
    const older = { ...newest, id: 'pay_1', status: 'FAILED' };
    expect(owedTransfer({ status: 'PENDING', payments: [newest, older] })?.paymentId).toBe('pay_2');
    expect(owedTransfer({ status: 'PENDING', payments: [older, newest] })).toBeNull();
  });

  it('copes with an order that lists no payments at all', () => {
    expect(owedTransfer({ status: 'PENDING', payments: [] })).toBeNull();
    expect(owedTransfer({ status: 'PENDING' })).toBeNull();
  });
});
