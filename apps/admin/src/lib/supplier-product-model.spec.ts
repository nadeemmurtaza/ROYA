import { supplierProductBody, type SupplierProductDraft } from './supplier-product-model';

const draft = (over: Partial<SupplierProductDraft> = {}): SupplierProductDraft => ({
  variantId: 'v1',
  cost: '12.50',
  moq: '',
  leadTimeDays: '',
  supplierSku: '',
  isPreferred: false,
  ...over,
});

describe('supplierProductBody', () => {
  it('turns what was typed into the request, with money in minor units', () => {
    const result = supplierProductBody(
      draft({ cost: '12.50', moq: '5', leadTimeDays: '14', supplierSku: ' SK-1 ', isPreferred: true }),
    );
    expect(result).toEqual({
      ok: true,
      body: { variantId: 'v1', lastCost: 1250, moq: 5, leadTimeDays: 14, supplierSku: 'SK-1', isPreferred: true },
    });
  });

  it('leaves the optional boxes out when blank, and defaults the smallest order to 1', () => {
    const result = supplierProductBody(draft());
    expect(result).toEqual({ ok: true, body: { variantId: 'v1', lastCost: 1250, moq: 1, isPreferred: false } });
  });

  it('accepts a free item (cost 0) but not a blank or negative price', () => {
    expect(supplierProductBody(draft({ cost: '0' })).ok).toBe(true);
    expect(supplierProductBody(draft({ cost: '' })).ok).toBe(false);
    expect(supplierProductBody(draft({ cost: '-1' })).ok).toBe(false);
    expect(supplierProductBody(draft({ cost: 'abc' })).ok).toBe(false);
  });

  it('refuses an order size or lead time that is not a whole, sensible number', () => {
    expect(supplierProductBody(draft({ moq: '0' })).ok).toBe(false);
    expect(supplierProductBody(draft({ moq: '2.5' })).ok).toBe(false);
    expect(supplierProductBody(draft({ leadTimeDays: '-3' })).ok).toBe(false);
    expect(supplierProductBody(draft({ leadTimeDays: '1.5' })).ok).toBe(false);
    expect(supplierProductBody(draft({ leadTimeDays: '0' })).ok).toBe(true);
  });

  it('needs an item chosen first', () => {
    expect(supplierProductBody(draft({ variantId: '' }))).toEqual({ ok: false, error: 'Choose an item to link.' });
  });
});
