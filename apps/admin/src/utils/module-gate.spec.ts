import { describe, expect, it } from 'vitest';
import { isModuleEnabled, pageGate } from './module-gate';

describe('isModuleEnabled', () => {
  it('shows an untagged item, and fails open while the module list is unknown', () => {
    expect(isModuleEnabled(undefined, ['orders'])).toBe(true);
    expect(isModuleEnabled('accounting', undefined)).toBe(true);
  });

  it('hides a tagged item once the list says the module is off', () => {
    expect(isModuleEnabled('accounting', ['orders'])).toBe(false);
    expect(isModuleEnabled('accounting', ['orders', 'accounting'])).toBe(true);
  });
});

describe('pageGate', () => {
  it('waits for the module list instead of mounting a page whose endpoints may not exist', () => {
    expect(pageGate('accounting', undefined, false)).toBe('wait');
  });

  it('shows the page once the module is on, and the off state once it is not', () => {
    expect(pageGate('accounting', ['orders', 'accounting'], false)).toBe('show');
    expect(pageGate('accounting', ['orders'], false)).toBe('off');
  });

  it('shows the page if the list never arrives, so its own error state can speak', () => {
    expect(pageGate('accounting', undefined, true)).toBe('show');
  });
});
