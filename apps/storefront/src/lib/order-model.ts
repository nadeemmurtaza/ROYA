import type { BankAccount, Order, OrderPayment } from '@/types/api';

/** What the order page needs to know about a bank transfer that is still owed. */
export interface OwedTransfer extends OrderPayment {
  /** A receipt is already with the atelier, so the page confirms it instead of asking again. */
  receiptSent: boolean;
}

/**
 * The bank transfer an order is still waiting on.
 *
 * Right after checkout the response carries the payment and the page shows it.
 * Come back later (from the account, or with the order number and phone) and
 * that response is gone, but the order itself still lists its payments, newest
 * first, with the accounts to pay into. A paid, cancelled or gateway payment is
 * not owed, and an order that has moved past awaiting-payment owes nothing.
 */
export function owedTransfer(order: Pick<Order, 'status' | 'payments'>): OwedTransfer | null {
  if (order.status !== 'PENDING') return null;
  const payment = order.payments?.[0];
  if (!payment || payment.provider !== 'bank_transfer') return null;
  if (payment.status !== 'AWAITING_APPROVAL' && payment.status !== 'PENDING') return null;
  const accounts: BankAccount[] | undefined = payment.meta?.accounts;
  return {
    paymentId: payment.id,
    redirectUrl: null,
    meta: accounts ? { accounts } : null,
    receiptSent: Boolean(payment.receiptUrl),
  };
}
