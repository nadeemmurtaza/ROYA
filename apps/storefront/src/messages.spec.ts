import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOCALES } from '@newax/shared';

/**
 * The two languages must say the same things: a key present in English and
 * missing in Arabic renders as the raw key on a customer's screen, and a
 * placeholder dropped from a translation prints a half-sentence.
 */
const load = (locale: string) =>
  JSON.parse(readFileSync(join(import.meta.dirname, '..', 'messages', `${locale}.json`), 'utf8')) as Record<
    string,
    unknown
  >;

function flatten(tree: Record<string, unknown>, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    if (typeof value === 'string') out.set(prefix + key, value);
    else if (value && typeof value === 'object') {
      for (const [k, v] of flatten(value as Record<string, unknown>, `${prefix}${key}.`)) out.set(k, v);
    }
  }
  return out;
}

/** The argument names at the top level of a message, plus its rich-text tags. A plural's per-language bodies (depth 2+) are skipped. */
function placeholders(message: string): string[] {
  const names = new Set<string>();
  let depth = 0;
  for (let index = 0; index < message.length; index++) {
    const char = message[index];
    if (char === '{') {
      depth++;
      if (depth === 1) {
        const name = /^(\w+)[,}]/.exec(message.slice(index + 1))?.[1];
        if (name) names.add(name);
      }
    } else if (char === '}') {
      depth--;
    }
  }
  for (const match of message.matchAll(/<(\w+)>/g)) names.add(`<${match[1]}>`);
  return [...names].sort();
}

describe('messages', () => {
  const [first, ...others] = LOCALES.map((locale) => ({ locale, messages: flatten(load(locale)) }));

  it('has the same keys in every language', () => {
    for (const other of others) {
      const missing = [...first!.messages.keys()].filter((key) => !other.messages.has(key));
      const extra = [...other.messages.keys()].filter((key) => !first!.messages.has(key));
      expect({ locale: other.locale, missing, extra }).toEqual({ locale: other.locale, missing: [], extra: [] });
    }
  });

  it('uses the same placeholders in every language', () => {
    const mismatched: string[] = [];
    for (const other of others) {
      for (const [key, english] of first!.messages) {
        const translated = other.messages.get(key);
        if (translated && placeholders(english).join() !== placeholders(translated).join()) {
          mismatched.push(`${other.locale}:${key}`);
        }
      }
    }
    expect(mismatched).toEqual([]);
  });

  it('has no empty message', () => {
    for (const { locale, messages } of [first!, ...others]) {
      const empty = [...messages].filter(([, text]) => text.trim() === '').map(([key]) => `${locale}:${key}`);
      expect(empty).toEqual([]);
    }
  });
});
