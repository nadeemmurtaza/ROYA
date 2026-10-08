'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/admin-client';
import { Badge, Button, DataTable, Dialog } from '@/components/ui';
import { useAdminSession } from '@/components/admin/session';
import { ROUTES } from '@/constants/routes';

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  isActive: boolean;
}

export default function SuppliersListPage() {
  const session = useAdminSession();
  const [creating, setCreating] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    adminFetch<{ data: Supplier[] }>('/admin/suppliers')
      .then((res) => setSuppliers(res.data))
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load suppliers'))
      .finally(() => setBusy(false));
  }, []);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 page-title">Suppliers</h1>
          <p className="text-sm text-neutral-900/60">All registered suppliers and vendors.</p>
        </div>
        {session.can('suppliers.manage') ? <Button onClick={() => setCreating(true)}>New supplier</Button> : null}
      </div>

      {error ? (
        <p role="alert" className="notice notice-error mb-4">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden">
        <DataTable
          rows={suppliers}
          loading={busy && !suppliers}
          rowKey={(supplier) => supplier.id}
          emptyLabel="No suppliers yet. A purchase order needs one."
          columns={[
            {
              header: 'Name',
              cell: (supplier) => (
                <Link
                  href={ROUTES.admin.supplier(supplier.id)}
                  className="font-medium text-accent-hover hover:underline"
                >
                  {supplier.name}
                </Link>
              ),
            },
            { header: 'Contact', muted: true, cell: (s) => s.contactName || '—' },
            { header: 'Phone', muted: true, cell: (s) => s.phone || '—' },
            { header: 'Email', muted: true, cell: (s) => s.email || '—' },
            { header: 'City', muted: true, cell: (s) => s.city || '—' },
            {
              header: 'Status',
              cell: (s) => (
                <Badge tone={s.isActive ? 'success' : 'neutral'}>
                  {s.isActive ? 'Active' : 'Inactive'}
                </Badge>
              ),
            },
          ]}
        />
      </div>
      <NewSupplierDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

/** The fields the API takes to create a supplier; everything after the name is optional. */
function NewSupplierDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    city: '',
    address: '',
    paymentTerms: '',
    leadTimeDays: '7',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = async () => {
    setSaving(true);
    setError(null);
    // Blank optional fields are left out: the API validates a present value (an empty email is not an email).
    const body: Record<string, string | number> = { name: form.name.trim() };
    for (const key of ['contactName', 'phone', 'email', 'city', 'address', 'paymentTerms', 'notes'] as const) {
      if (form[key].trim()) body[key] = form[key].trim();
    }
    if (form.leadTimeDays.trim() !== '') body.leadTimeDays = Number(form.leadTimeDays);
    try {
      const created = await adminFetch<{ id: string }>('/admin/suppliers', { method: 'POST', body });
      router.push(ROUTES.admin.supplier(created.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add the supplier');
      setSaving(false);
    }
  };

  const text = (id: string, label: string, key: keyof typeof form, extra: Record<string, string> = {}) => (
    <div>
      <label htmlFor={`supplier-${id}`} className="field-label">
        {label}
      </label>
      <input
        id={`supplier-${id}`}
        className="field-input mt-1 w-full"
        value={form[key]}
        onChange={set(key)}
        {...extra}
      />
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New supplier"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving || !form.name.trim()} loading={saving}>
            Add supplier
          </Button>
        </div>
      }
    >
      {error ? (
        <p role="alert" className="notice notice-error mb-3">
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        {text('name', 'Name', 'name')}
        <div className="grid gap-3 sm:grid-cols-2">
          {text('contact', 'Contact person', 'contactName')}
          {text('phone', 'Phone', 'phone', { type: 'tel', dir: 'ltr' })}
          {text('email', 'Email', 'email', { type: 'email', dir: 'ltr' })}
          {text('city', 'City', 'city')}
        </div>
        {text('address', 'Address', 'address')}
        <div className="grid gap-3 sm:grid-cols-2">
          {text('terms', 'Payment terms', 'paymentTerms')}
          {text('lead', 'Lead time (days)', 'leadTimeDays', { type: 'number', min: '0', inputMode: 'numeric' })}
        </div>
        {text('notes', 'Notes', 'notes')}
      </div>
    </Dialog>
  );
}
