import { SECOND_LOCALE } from '@newax/shared';
import type { Locale } from '@newax/shared';

/**
 * The assistant's own fixed sentences — the ones sent instead of the model's
 * words whenever this shop cannot safely answer, or has no account on file
 * for the sender at all. House Rule 1: a WhatsApp reply is customer-facing
 * text like any other, so an English-only literal here is exactly the leak
 * the rule forbids, same idiom as notifications/email/copy.ts's own
 * EmailCopy — one interface, two implementations.
 *
 * The assistant's own AI-generated replies already match the customer's
 * language by prompting the model to (see SYSTEM_PROMPT in
 * whatsapp-assistant.service.ts) — these two sentences are the ones sent
 * when there is no model call to ask, so language is picked with a cheap,
 * deterministic heuristic instead: whether the customer's own message
 * contains Arabic script. A customer writing Arabic in Latin letters falls back to
 * English, which is an honest limit of a heuristic, not a silent literal.
 */
export interface WhatsAppAssistantCopy {
  /** No account on file for the sending number — nothing to verify identity against, so nothing more specific is said. */
  unrecognisedNumber: string;
  /** Sent whenever this shop hands the conversation to a person, whatever the reason. */
  handoff: string;
}

const COPY: Record<Locale, WhatsAppAssistantCopy> = {
  en: {
    unrecognisedNumber:
      "We don't have an account on file for this number yet. If you have an order with us, please message from the number you ordered with, or reach out from our website.",
    handoff: "Thanks for reaching out — I've passed this to our team and someone will reply here shortly.",
  },
  ar: {
    unrecognisedNumber:
      'لا يوجد لدينا حساب مرتبط بهذا الرقم بعد. إن كان لديكم طلب معنا، يرجى مراسلتنا من الرقم الذي استخدمتموه عند الطلب، أو التواصل معنا عبر موقعنا الإلكتروني.',
    handoff: 'شكرًا لتواصلكم — لقد حوّلنا رسالتكم إلى فريقنا وسيرد عليكم أحدهم هنا قريبًا.',
  },
};

/** The Arabic Unicode block, which other Arabic-script languages share; that is fine, this only decides which fixed sentence to send. */
const SECOND_SCRIPT = /[\u0600-\u06FF]/;

export function detectWhatsAppLocale(text: string): Locale {
  return SECOND_SCRIPT.test(text) ? SECOND_LOCALE : 'en';
}

export function whatsAppAssistantCopy(customerMessage: string): WhatsAppAssistantCopy {
  return COPY[detectWhatsAppLocale(customerMessage)];
}
