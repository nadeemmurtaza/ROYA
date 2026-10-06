import { BRAND } from '@newax/shared';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A `currency` column's database default is a literal in a .prisma file, so it
 * cannot follow BRAND.locale.currency. This test is what keeps the two equal.
 *
 * It matters because the Blueprint ships with its own market's currency as that
 * default and the code relies on it: an upgrade sync that overwrites the schema
 * files would put it back, and every order would silently be stored in the wrong
 * currency. A failure here means: set the default in the schema AND in a new
 * migration (see 20261005130000_roya_currency_defaults).
 */
describe('currency column defaults', () => {
  const schemaDir = join(__dirname, '..', 'prisma', 'schema');
  const schemaFiles = readdirSync(schemaDir).filter((name) => name.endsWith('.prisma'));

  it('finds the schema files, so an empty scan cannot pass', () => {
    expect(schemaFiles.length).toBeGreaterThan(20);
  });

  it("gives every `currency` column the brand's currency as its default", () => {
    const offenders: string[] = [];
    let seen = 0;

    for (const file of schemaFiles) {
      let model = '';
      for (const line of readFileSync(join(schemaDir, file), 'utf8').split('\n')) {
        const modelMatch = /^model\s+(\w+)/.exec(line);
        if (modelMatch) model = modelMatch[1]!;
        const column = /^\s*currency\s+String\b.*@default\("([^"]*)"\)/.exec(line);
        if (!column) continue;
        seen += 1;
        if (column[1] !== BRAND.locale.currency) {
          offenders.push(`${file} ${model}.currency defaults to "${column[1]}", not "${BRAND.locale.currency}"`);
        }
      }
    }

    expect(seen).toBeGreaterThanOrEqual(8);
    expect(offenders).toEqual([]);
  });

  it("gives an address the brand's country, not the Blueprint's", () => {
    const core = readFileSync(join(schemaDir, 'core.prisma'), 'utf8');
    const match = /model Address \{[\s\S]*?country\s+String\s+@default\("([^"]*)"\)/.exec(core);
    expect(match?.[1]).toBe(BRAND.locale.countryCode);
  });
});
