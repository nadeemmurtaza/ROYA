import type { ReactNode } from 'react';

/**
 * A labelled field with its error beneath it. The label is a real <label> for
 * the input; the error is announced (role="alert") and tied to the input by
 * aria-describedby, which the caller wires with `describedBy(id)`.
 */
export const describedBy = (id: string): string => `${id}-error`;

export function Field({
  id,
  label,
  error,
  wide = false,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`f${wide ? ' f-wide' : ''}`}>
      <label className="lbl" htmlFor={id}>
        {label}
      </label>
      {children}
      <span id={describedBy(id)} role={error ? 'alert' : undefined} className="field-error f-error">
        {error}
      </span>
    </div>
  );
}
