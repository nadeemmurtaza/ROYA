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

export interface ParsedLead {
  /** The kind of appointment asked for, when the lead came from the consultation form. */
  kind: Kind | null;
  preferred: string | null;
  where: string | null;
  orderNumber: string | null;
  /** What the client wrote, once the lines `leadFrom` adds are taken out. */
  text: string;
}

/**
 * The inverse of `leadFrom`: the desk reads a request's message back into
 * facts. A lead that came from anywhere else (a WhatsApp enquiry typed in by
 * hand) simply has no kind and keeps its whole message as text.
 */
export function parseLeadMessage(message: string | null | undefined): ParsedLead {
  const parsed: ParsedLead = { kind: null, preferred: null, where: null, orderNumber: null, text: '' };
  const rest: string[] = [];
  for (const line of (message ?? '').split('\n')) {
    const consultation = /^Consultation request:\s*(\w+)\s*$/.exec(line);
    if (consultation && isKind(consultation[1])) parsed.kind = consultation[1];
    else if (parsed.kind && /^Preferred:\s*(.+)$/.test(line)) parsed.preferred = line.replace(/^Preferred:\s*/, '');
    else if (parsed.kind && /^Where:\s*(.+)$/.test(line)) parsed.where = line.replace(/^Where:\s*/, '');
    else if (parsed.kind && /^Order:\s*(.+)$/.test(line)) parsed.orderNumber = line.replace(/^Order:\s*/, '');
    else rest.push(line);
  }
  parsed.text = rest.join('\n').trim();
  return parsed;
}
