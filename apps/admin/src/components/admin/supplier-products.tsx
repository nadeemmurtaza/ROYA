'use client';

import { useCallback, useEffect, useState } from 'react';
import { CURRENCY, formatMoney } from '@newax/shared';
import { adminFetch } from '@/lib/admin-client';
import { supplierProductBody, type SupplierProductDraft } from '@/lib/supplier-product-model';
import { Badge, Button, ConfirmDialog, DataTable, EmptyState, Field, Loading, Section } from '@/components/ui';

interface VariantRef {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  product: { id: string; name: string };
}

interface LinkedProduct {
  id: string;
  variantId: string;
  supplierSku: string | null;
  lastCost: number;
  moq: number;
  leadTimeDays: number | null;
  isPreferred: boolean;
  variant: VariantRef;
}

const itemName = (variant: VariantRef): string =>
  [variant.product.name, variant.size, variant.color].filter(Boolean).join(' · ');

const EMPTY_DRAFT: SupplierProductDraft = {
  variantId: '',
  cost: '',
  moq: '',
  leadTimeDays: '',
  supplierSku: '',
  isPreferred: false,
};

/**
 * What a supplier sells the house: the fabrics, trims and packaging a purchase
 * order is drawn from. A purchase order can only list items linked here, so this
 * is the other half of "New purchase order", and without it that page had no way
 * to ever offer anything.
 */
export function SupplierProducts({ supplierId }: { supplierId: string }) {
  const [rows, setRows] = useState<LinkedProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<VariantRef[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<VariantRef | null>(null);
  const [draft, setDraft] = useState<SupplierProductDraft>(EMPTY_DRAFT);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const [removing, setRemoving] = useState<LinkedProduct | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminFetch<{ data: LinkedProduct[] }>(`/admin/suppliers/${supplierId}/products`);
      setRows(res.data);
      setLoadError(null);
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Could not load the linked items');
    }
  }, [supplierId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The stock list is the one catalogue of everything that can be bought, raw materials included; it answers with a plain list.
  useEffect(() => {
    const text = search.trim();
    if (!text) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      adminFetch<VariantRef[]>('/admin/inventory', { query: { search: text } })
        .then((list) => setResults(list.slice(0, 8)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const linkedIds = new Set((rows ?? []).map((row) => row.variantId));

  function pick(variant: VariantRef) {
    setPicked(variant);
    setDraft({ ...EMPTY_DRAFT, variantId: variant.id });
    setFormError(null);
    setSaved(null);
    setSearch('');
    setResults([]);
  }

  function cancel() {
    setPicked(null);
    setDraft(EMPTY_DRAFT);
    setFormError(null);
  }

  async function link() {
    const result = supplierProductBody(draft);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await adminFetch(`/admin/suppliers/${supplierId}/products`, { method: 'POST', body: result.body });
      setSaved(`${picked ? itemName(picked) : 'Item'} is linked.`);
      cancel();
      await load();
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'Could not link this item');
    } finally {
      setSaving(false);
    }
  }

  async function unlink() {
    if (!removing) return;
    setRemoveBusy(true);
    try {
      await adminFetch(`/admin/suppliers/${supplierId}/products/${removing.variantId}`, { method: 'DELETE' });
      setSaved(`${itemName(removing.variant)} is no longer linked.`);
      setRemoving(null);
      await load();
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'Could not unlink this item');
      setRemoving(null);
    } finally {
      setRemoveBusy(false);
    }
  }

  const set = (field: keyof SupplierProductDraft, value: string | boolean) =>
    setDraft((current) => ({ ...current, [field]: value }));

  return (
    <Section
      className="mt-6"
      title="Items this supplier sells"
      description="A purchase order can only list items linked here, at the price agreed with this supplier."
    >
      {loadError ? (
        <p role="alert" className="notice notice-error mb-4">
          {loadError}
        </p>
      ) : null}
      {saved ? (
        <p role="status" className="mb-4 text-sm text-green-700">
          {saved}
        </p>
      ) : null}

      <div className="card mb-4 overflow-hidden">
        {rows === null && !loadError ? (
          <Loading label="Loading linked items" />
        ) : rows && rows.length === 0 ? (
          <EmptyState
            title="No items linked yet"
            description="Search for a fabric, trim or piece below and link it, then it can go on a purchase order."
          />
        ) : (
          <DataTable
            rows={rows}
            rowKey={(row) => row.id}
            stacked
            columns={[
              {
                header: 'Item',
                cell: (row) => (
                  <>
                    <div className="font-medium text-neutral-900">{itemName(row.variant)}</div>
                    <div className="text-xs text-neutral-900/60">{row.variant.sku}</div>
                  </>
                ),
              },
              { header: 'Their code', cell: (row) => row.supplierSku ?? '—', muted: true },
              { header: `Cost (${CURRENCY})`, cell: (row) => formatMoney(row.lastCost), align: 'end', numeric: true },
              { header: 'Smallest order', cell: (row) => row.moq, align: 'end', numeric: true },
              {
                header: 'Lead time',
                cell: (row) => (row.leadTimeDays === null ? '—' : `${row.leadTimeDays} days`),
                align: 'end',
                numeric: true,
              },
              { header: '', cell: (row) => (row.isPreferred ? <Badge tone="info">Preferred</Badge> : null) },
              {
                header: '',
                align: 'end',
                cell: (row) => (
                  <button
                    type="button"
                    onClick={() => setRemoving(row)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Unlink
                  </button>
                ),
              },
            ]}
          />
        )}
      </div>

      <div className="card p-6">
        {picked ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void link();
            }}
            noValidate
            className="space-y-4"
          >
            <h3 className="font-medium text-neutral-900">Link {itemName(picked)}</h3>
            <p className="text-xs text-neutral-900/60">{picked.sku}</p>
            {formError ? (
              <p role="alert" className="notice notice-error">
                {formError}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={`Cost per unit (${CURRENCY})`}>
                {(control) => (
                  <input
                    {...control}
                    className="field-input w-full"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={draft.cost}
                    onChange={(event) => set('cost', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Smallest order" hint="Leave blank for 1.">
                {(control) => (
                  <input
                    {...control}
                    className="field-input w-full"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    step="1"
                    value={draft.moq}
                    onChange={(event) => set('moq', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Lead time (days)" hint="Leave blank to use the supplier's own.">
                {(control) => (
                  <input
                    {...control}
                    className="field-input w-full"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={draft.leadTimeDays}
                    onChange={(event) => set('leadTimeDays', event.target.value)}
                  />
                )}
              </Field>
              <Field label="Their code for it" hint="Optional.">
                {(control) => (
                  <input
                    {...control}
                    className="field-input w-full"
                    value={draft.supplierSku}
                    onChange={(event) => set('supplierSku', event.target.value)}
                  />
                )}
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-900">
              <input
                type="checkbox"
                checked={draft.isPreferred}
                onChange={(event) => set('isPreferred', event.target.checked)}
              />
              The preferred supplier for this item
            </label>
            <div className="flex gap-3">
              <Button type="submit" loading={saving} loadingLabel="Linking…">
                Link item
              </Button>
              <Button variant="secondary" onClick={cancel}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="max-w-md">
            <label htmlFor="supplier-item-search" className="field-label">
              Link an item
            </label>
            <input
              id="supplier-item-search"
              type="search"
              className="field-input w-full"
              placeholder="Search by name or SKU…"
              autoComplete="off"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div aria-live="polite">
              {searching ? <p className="mt-2 text-sm text-neutral-900/60">Searching…</p> : null}
              {!searching && search.trim() && results.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-900/60">Nothing matches “{search.trim()}”.</p>
              ) : null}
              {results.length > 0 ? (
                <ul className="mt-2 divide-y divide-neutral-100 rounded border border-neutral-100">
                  {results.map((variant) => (
                    <li key={variant.id} className="flex items-center justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-neutral-900">{itemName(variant)}</div>
                        <div className="text-xs text-neutral-900/60">{variant.sku}</div>
                      </div>
                      {linkedIds.has(variant.id) ? (
                        <span className="text-xs text-neutral-900/60">Linked</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => pick(variant)}
                          className="text-xs font-medium text-accent-hover hover:underline"
                        >
                          Link
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={removing !== null}
        onClose={() => setRemoving(null)}
        onConfirm={unlink}
        busy={removeBusy}
        title={removing ? `Unlink ${itemName(removing.variant)}?` : 'Unlink this item?'}
        description="It stops being offered on new purchase orders for this supplier. Orders already raised are unaffected."
        confirmLabel="Unlink item"
      />
    </Section>
  );
}
