import { useCallback, useLayoutEffect, useRef } from 'react';

/**
 * CSS for values only the browser can know, without a `style` attribute.
 *
 * Every rule of CSS in this app lives in a stylesheet. Most of it is written by
 * hand in `globals.css`; a few values cannot be, because they are measured at
 * runtime (where a popover sits, how far a tab indicator slides, how long a
 * toast lives, how full a bar is). Those used to be `style={{…}}` props and
 * `el.style.setProperty(…)` calls, which put CSS in the markup. They go through
 * here instead: the element gets a `data-dyn` hook and one rule for that hook is
 * written into a single stylesheet attached to the document, so the DOM carries
 * no `style` attribute and the cascade has one more sheet, not a second source.
 *
 *   setCssVars(panel, { '--popover-max-height': '320px', top: '48px' });
 *   clearCssVars(panel);               // on unmount: the rule goes with the element
 *   const ref = useCssVars({ '--p': 0.4 });   // declarative, for a render-time value
 *
 * Specificity is `:root [data-dyn="n"]` (0,2,0), so a value set here beats a
 * single-class rule exactly as an inline style did.
 *
 * The sheet is a constructable stylesheet adopted by the document (Chrome 73,
 * Firefox 101, Safari 16.4) and, where that does not exist, a `<style>` element
 * whose rules are inserted through the CSSOM. Either is allowed by a CSP that
 * forbids inline styles, because neither is inline markup.
 *
 * Failure mode: with no document (the server) or no usable sheet, setting is a
 * no-op and the element renders with the stylesheet's own defaults (an unplaced
 * popover sits in flow; an empty bar is empty). The server never renders a value
 * from here, so nothing is lost that was not already client-only.
 *
 * This file is the one place `scripts/check-global-css.mjs` allows a CSSOM
 * `.style` write, because it is writing a stylesheet rule, not an element.
 */

export const DYNAMIC_ATTRIBUTE = 'data-dyn';

/** A property (custom or standard) and its value; `null` removes the property. */
export type Declarations = Readonly<Record<string, string | number | null>>;

export interface RuleLike {
  readonly style: { setProperty(name: string, value: string): void; removeProperty(name: string): string };
}
export interface SheetLike {
  readonly cssRules: ArrayLike<RuleLike>;
  insertRule(rule: string, index?: number): number;
  deleteRule(index: number): void;
}
export interface HostLike {
  getAttribute(name: string): string | null;
  setAttribute(name: string, value: string): void;
  removeAttribute(name: string): void;
}

/** The rule store, over any sheet: the browser's in the app, a fake in the spec. */
export function createDynamicStyles(getSheet: () => SheetLike | null) {
  const rules = new Map<string, RuleLike>();
  let counter = 0;

  function set(element: HostLike, declarations: Declarations): void {
    const sheet = getSheet();
    if (!sheet) return;
    const known = element.getAttribute(DYNAMIC_ATTRIBUTE);
    let rule = known ? rules.get(known) : undefined;
    if (!rule) {
      counter += 1;
      const id = String(counter);
      const index = sheet.insertRule(`:root [${DYNAMIC_ATTRIBUTE}="${id}"]{}`, sheet.cssRules.length);
      rule = sheet.cssRules[index];
      if (!rule) return;
      rules.set(id, rule);
      element.setAttribute(DYNAMIC_ATTRIBUTE, id);
    }
    for (const [name, value] of Object.entries(declarations)) {
      if (value === null) rule.style.removeProperty(name);
      else rule.style.setProperty(name, String(value));
    }
  }

  function clear(element: HostLike): void {
    const id = element.getAttribute(DYNAMIC_ATTRIBUTE);
    if (!id) return;
    element.removeAttribute(DYNAMIC_ATTRIBUTE);
    const rule = rules.get(id);
    rules.delete(id);
    const sheet = getSheet();
    if (!rule || !sheet) return;
    for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
      if (sheet.cssRules[index] === rule) {
        sheet.deleteRule(index);
        return;
      }
    }
  }

  return { set, clear, size: () => rules.size };
}

let documentSheet: SheetLike | null | undefined;

function browserSheet(): SheetLike | null {
  if (typeof document === 'undefined') return null;
  if (documentSheet !== undefined) return documentSheet;
  try {
    if ('adoptedStyleSheets' in document && typeof CSSStyleSheet === 'function') {
      const sheet = new CSSStyleSheet();
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      documentSheet = sheet as unknown as SheetLike;
      return documentSheet;
    }
  } catch {
    // No constructable sheets here: fall through to the element sheet.
  }
  const element = document.createElement('style');
  element.setAttribute('data-dynamic-style', '');
  document.head.appendChild(element);
  documentSheet = (element.sheet as unknown as SheetLike | null) ?? null;
  return documentSheet;
}

const store = createDynamicStyles(browserSheet);

export const setCssVars = (element: Element, declarations: Declarations): void => store.set(element, declarations);
export const clearCssVars = (element: Element): void => store.clear(element);

/**
 * A callback ref that keeps `declarations` applied to the element it is given,
 * re-applying when they change and removing the rule when the element goes.
 * For a value that comes from render (a fraction, a duration); a value measured
 * in an effect calls `setCssVars` directly.
 */
export function useCssVars<T extends Element = HTMLElement>(declarations: Declarations | null) {
  const element = useRef<T | null>(null);
  const latest = useRef<Declarations | null>(declarations);
  const key = JSON.stringify(declarations);

  useLayoutEffect(() => {
    latest.current = JSON.parse(key) as Declarations | null;
    if (!element.current) return;
    if (latest.current) setCssVars(element.current, latest.current);
    else clearCssVars(element.current);
  }, [key]);

  return useCallback((node: T | null) => {
    if (node) {
      element.current = node;
      if (latest.current) setCssVars(node, latest.current);
    } else if (element.current) {
      clearCssVars(element.current);
      element.current = null;
    }
  }, []);
}
