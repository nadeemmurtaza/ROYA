import { DYNAMIC_ATTRIBUTE, createDynamicStyles, type HostLike, type RuleLike, type SheetLike } from './dynamic-style';

class FakeRule implements RuleLike {
  declarations = new Map<string, string>();
  constructor(readonly selector: string) {}
  style = {
    setProperty: (name: string, value: string) => void this.declarations.set(name, value),
    removeProperty: (name: string) => {
      const previous = this.declarations.get(name) ?? '';
      this.declarations.delete(name);
      return previous;
    },
  };
}

class FakeSheet implements SheetLike {
  cssRules: FakeRule[] = [];
  insertRule(rule: string, index = this.cssRules.length): number {
    this.cssRules.splice(index, 0, new FakeRule(rule));
    return index;
  }
  deleteRule(index: number): void {
    this.cssRules.splice(index, 1);
  }
}

class FakeElement implements HostLike {
  attributes = new Map<string, string>();
  getAttribute = (name: string) => this.attributes.get(name) ?? null;
  setAttribute = (name: string, value: string) => void this.attributes.set(name, value);
  removeAttribute = (name: string) => void this.attributes.delete(name);
}

describe('dynamic styles', () => {
  it('writes one rule per element, keyed by a data hook, with the element holding no style of its own', () => {
    const sheet = new FakeSheet();
    const styles = createDynamicStyles(() => sheet);
    const element = new FakeElement();
    styles.set(element, { '--p': 0.4 });
    expect(sheet.cssRules).toHaveLength(1);
    const id = element.getAttribute(DYNAMIC_ATTRIBUTE)!;
    expect(sheet.cssRules[0]!.selector).toBe(`:root [${DYNAMIC_ATTRIBUTE}="${id}"]{}`);
    expect(sheet.cssRules[0]!.declarations.get('--p')).toBe('0.4');
    expect([...element.attributes.keys()]).toEqual([DYNAMIC_ATTRIBUTE]);
  });

  it('updates the same rule on a second set, and null removes a property', () => {
    const sheet = new FakeSheet();
    const styles = createDynamicStyles(() => sheet);
    const element = new FakeElement();
    styles.set(element, { top: '10px', bottom: '20px' });
    styles.set(element, { top: '12px', bottom: null });
    expect(sheet.cssRules).toHaveLength(1);
    expect(Object.fromEntries(sheet.cssRules[0]!.declarations)).toEqual({ top: '12px' });
  });

  it('gives two elements two rules that do not share values', () => {
    const sheet = new FakeSheet();
    const styles = createDynamicStyles(() => sheet);
    const a = new FakeElement();
    const b = new FakeElement();
    styles.set(a, { '--p': 0.1 });
    styles.set(b, { '--p': 0.9 });
    expect(a.getAttribute(DYNAMIC_ATTRIBUTE)).not.toBe(b.getAttribute(DYNAMIC_ATTRIBUTE));
    expect(sheet.cssRules.map((rule) => rule.declarations.get('--p'))).toEqual(['0.1', '0.9']);
  });

  it('removes the right rule and the hook on clear, whatever order elements go in', () => {
    const sheet = new FakeSheet();
    const styles = createDynamicStyles(() => sheet);
    const [a, b, c] = [new FakeElement(), new FakeElement(), new FakeElement()];
    styles.set(a, { '--n': 1 });
    styles.set(b, { '--n': 2 });
    styles.set(c, { '--n': 3 });
    styles.clear(a);
    expect(sheet.cssRules.map((rule) => rule.declarations.get('--n'))).toEqual(['2', '3']);
    expect(a.getAttribute(DYNAMIC_ATTRIBUTE)).toBeNull();
    styles.clear(c);
    expect(sheet.cssRules.map((rule) => rule.declarations.get('--n'))).toEqual(['2']);
    expect(styles.size()).toBe(1);
  });

  it('clearing an element that never had a rule is harmless', () => {
    const styles = createDynamicStyles(() => new FakeSheet());
    expect(() => styles.clear(new FakeElement())).not.toThrow();
  });

  it('is a no-op, not an error, where there is no sheet (the server, an old browser)', () => {
    const styles = createDynamicStyles(() => null);
    const element = new FakeElement();
    expect(() => styles.set(element, { '--p': 1 })).not.toThrow();
    expect(element.attributes.size).toBe(0);
  });
});
