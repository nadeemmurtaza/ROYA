import { join } from 'node:path';
import * as ts from 'typescript';

/**
 * A `paths` alias in tsconfig.json is for the type checker, but a bundler reads
 * it too, and Vercel builds the API with one. An alias that names a `.d.ts`
 * therefore makes the bundler pull in the declaration file, which exports
 * nothing: the build only warns ("encryptSecret is not exported by
 * secret-crypto.d.ts") and ships `undefined`, so SSO and mail-account passwords
 * fail at run time. A target without an extension satisfies both readers: the
 * type checker finds the `.d.ts`, a bundler finds the `.js`.
 *
 * A failure here means: drop the extension from the alias target.
 */
describe('tsconfig.json path aliases', () => {
  const file = join(__dirname, '..', 'tsconfig.json');
  const { config, error } = ts.readConfigFile(file, ts.sys.readFile);
  const paths: Record<string, string[]> = config?.compilerOptions?.paths ?? {};

  it('reads the file, so an empty scan cannot pass', () => {
    expect(error).toBeUndefined();
    expect(Object.keys(paths)).toContain('@newax/shared/secret-crypto');
  });

  it('points no alias at a declaration or source file a bundler cannot run', () => {
    const offenders = Object.entries(paths).flatMap(([alias, targets]) =>
      targets.filter((target) => /\.(d\.[cm]?ts|[cm]?tsx?)$/.test(target)).map((target) => `${alias} -> ${target}`),
    );
    expect(offenders).toEqual([]);
  });
});
