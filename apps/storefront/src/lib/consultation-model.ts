import { normalizePhone } from '@newax/shared';

/**
 * A consultation request, and how it becomes a lead in the atelier's CRM.
 * Pure, so the rules and the message the designer reads are tested.
 */
export const KINDS = ['atelier', 'home', 'video'] as const;
export type Kind = (typeof KINDS)[number];
export const isKind = (value: unknown): value is Kind => KINDS.includes(value as Kind);

export const TIMES = ['any', 'morning', 'afternoon', 'evening'] as const;
export type Time = (typeof TIMES)[number];

export interface ConsultationForm {
  kind: Kind;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: Time;
  where: string;
  message: string;
  orderNumber: string;
}

export type ConsultationProblem = 'name' | 'reach' | 'email' | 'phone';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateConsultation(form: ConsultationForm): ConsultationProblem[] {
  const problems: ConsultationProblem[] = [];
  if (!form.name.trim()) problems.push('name');
  const email = form.email.trim();
  const phone = form.phone.trim();
  if (!email && !phone) problems.push('reach');
  if (email && !EMAIL.test(email)) problems.push('email');
  if (phone && normalizePhone(phone).e164 === null) problems.push('phone');
  return problems;
}

/** What the CRM lead holds. The labels are English: the designer reads them, whatever language the client wrote in. */
export function leadFrom(form: ConsultationForm): {
  name: string;
  email?: string;
  phone?: string;
  message: string;
  source: string;
} {
  const phone = normalizePhone(form.phone).e164 ?? undefined;
  const lines = [
    `Consultation request: ${form.kind}`,
    form.date || form.time !== 'any'
      ? `Preferred: ${[form.date, form.time !== 'any' ? form.time : ''].filter(Boolean).join(', ')}`
      : '',
    form.where.trim() ? `Where: ${form.where.trim()}` : '',
    form.orderNumber ? `Order: ${form.orderNumber}` : '',
    form.message.trim(),
  ].filter(Boolean);
  return {
    name: form.name.trim(),
    ...(form.email.trim() ? { email: form.email.trim() } : {}),
    ...(phone ? { phone } : {}),
    message: lines.join('\n').slice(0, 2000),
    source: `consultation-${form.kind}`,
  };
}
