#!/usr/bin/env node
/**
 * Every rule of CSS lives in a global stylesheet. None in the markup.
 *
 * The standing instruction: "make sure whole css is global css, even a single
 * inline css is not bearable". Colour, size, spacing, motion: all of it is a
 * class, a custom property or a `data-*` hook that a stylesheet in
 * `apps/storefront/src/styles/` or `apps/admin/src/app/globals.css` answers.
 * This script is what keeps it that way, because "nobody writes one" is not a
 * guarantee and a review does not count characters.
 *
 * It reads application source (never specs or e2e scripts) and fails on:
 *
 *   style-attr      `style={…}` / `style="…"`, a style attribute in markup
 *   style-tag       a `<style>` element, in JSX or in a string
 *   style-write     `el.style.x = …`, `.style.setProperty(…)`, `.style.cssText`
 *   style-attribute `setAttribute('style', …)`
 *   style-key       `{ style: { … } }` and `contentStyle={{ … }}` style objects
 *   next-image      `next/image` (it inlines `position:absolute; color:transparent`
 *                   on every <img>); use the `Image` wrapper in `components/`
 *   css-in-js       styled-components, emotion, styled-jsx, vanilla-extract …
 *   css-module      `*.module.css` (a stylesheet nobody can see globally)
 *
 * and on the storefront utility file (`styles/utility.css`) drifting from its
 * users: a `u-*` class used in a component but not defined is a style that
 * silently does nothing; one defined but used nowhere is dead CSS.
 *
 * What a value that only the browser knows (where a popover sits, how full a
 * bar is) does instead is `apps/admin/src/lib/dynamic-style.ts`: a rule in a
 * stylesheet attached to the document, hooked by `data-dyn`. That file is the
 * one allowed to touch a CSSOM `.style`, because what it writes to is a rule,
 * not an element.
 *
 * Exceptions are in ALLOWED below, each with its reason, and an exception that
 * no longer matches anything fails the run, so the list cannot rot into a
 * blanket pass. Not covered, and said so: a library that writes its own inline
 * style at runtime (Next's route announcer, Recharts' chart wrappers) is not
 * code in this repository; `scripts/check-global-css.mjs` cannot see it and the
 * README of the rule says which they are.
 *
 * Usage: node scripts/check-global-css.mjs [--self-test]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Application source only: what Law 1 and this rule scope themselves to. */
const SCAN_DIRS = ['apps/storefront/src', 'apps/admin/src', 'apps/api/src', 'packages/shared/src'];
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const SKIP_FILE = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
const SKIP_DIR = new Set(['node_modules', 'dist', '.next', 'e2e', '__snapshots__']);

/** @type {{ id: string, test: RegExp, why: string }[]} */
export const RULES = [
  {
    id: 'style-attr',
    // Prettier writes JSX attributes with no spaces around `=`, so `const style = {` is not this.
    test: /(?<=[\s<"'`])style=(?:\{|"|')/,
    why: 'a style attribute puts CSS in the markup; use a class, or a data-* hook the stylesheet answers',
  },
  {
    id: 'style-tag',
    test: /<style[\s>]/i,
    why: 'a <style> element is CSS in the document; put the rules in a stylesheet (the tokens are served from /theme.css)',
  },
  {
    id: 'style-write',
    test: /\.style\s*(?:\.|\[)/,
    why: 'writing el.style puts CSS on the element; toggle a class or data-* hook, or use lib/dynamic-style.ts for a measured value',
  },
  {
    id: 'style-attribute',
    test: /setAttribute\(\s*['"`]style['"`]/,
    why: 'setAttribute("style") is an inline style written by script',
  },
  {
    id: 'style-key',
    test: /\bstyle\s*:\s*\{|\b[a-z]+Style\s*=\s*\{/,
    why: 'a style object becomes an inline style; give the component a className, or content that renders classes',
  },
  {
    id: 'next-image',
    test: /from\s+['"]next\/image['"]/,
    why: 'next/image inlines its own style on every <img>; import the Image wrapper from components/ instead',
  },
  {
    id: 'css-in-js',
    test: /from\s+['"](?:styled-components|@emotion\/[^'"]+|styled-jsx[^'"]*|@stitches\/[^'"]+|@vanilla-extract\/[^'"]+|goober|linaria[^'"]*)['"]/,
    why: 'CSS-in-JS writes rules at runtime outside the stylesheets',
  },
  {
    id: 'css-module',
    test: /from\s+['"][^'"]+\.module\.(?:css|scss|sass)['"]/,
    why: 'a CSS module is not a global stylesheet',
  },
];

/**
 * Files allowed to break a rule, and why. Each entry must still match, or the
 * run fails (see `unusedAllowances`). Paths are repo-relative with `/`.
 *
 * @type {{ file: string, rules: string[], why: string }[]}
 */
export const ALLOWED = [
  {
    file: 'apps/admin/src/lib/dynamic-style.ts',
    rules: ['style-write', 'style-key'],
    why: 'the dynamic-rule helper writes a stylesheet RULE through the CSSOM (rule.style), never an element',
  },
  {
    file: 'apps/storefront/src/components/Image.tsx',
    rules: ['next-image'],
    why: "the sanctioned wrapper: next/image's getImageProps() with the inline style dropped",
  },
  {
    file: 'apps/admin/src/components/ui/image.tsx',
    rules: ['next-image'],
    why: "the sanctioned wrapper: next/image's getImageProps() with the inline style dropped",
  },
  {
    file: 'apps/api/src/core/notifications/email/html.ts',
    rules: ['style-attr'],
    why: "HTML email: Outlook renders with Word's engine and Gmail strips <style>, so inline CSS is the only CSS a mail client honours. Not a page this product serves",
  },
  {
    file: 'apps/api/src/modules/merchandising/marketing/campaigns.service.ts',
    rules: ['style-attr'],
    why: 'the open-tracking pixel inside a campaign email, same reason as the email templates',
  },
];

/**
 * Blank out comments, keeping line numbers and everything else (strings and
 * template literals are code here: an HTML string with a style attribute is
 * exactly what is being looked for). A small scanner rather than a regex, so
 * `'src/**\/*.ts'` and `https://…` inside a string are not read as comments.
 */
export function stripComments(source) {
  let out = '';
  let i = 0;
  let previousSignificant = '';
  const n = source.length;
  while (i < n) {
    const c = source[i];
    const next = source[i + 1];
    if (c === '/' && next === '/') {
      while (i < n && source[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i += 1;
      }
      i += 2;
      out += '  ';
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      out += c;
      i += 1;
      while (i < n && source[i] !== quote && source[i] !== '\n') {
        if (source[i] === '\\') {
          out += source[i];
          i += 1;
        }
        out += source[i] ?? '';
        i += 1;
      }
      out += source[i] ?? '';
      i += 1;
      previousSignificant = quote;
      continue;
    }
    if (c === '`') {
      out += c;
      i += 1;
      while (i < n && source[i] !== '`') {
        if (source[i] === '\\') {
          out += source[i];
          i += 1;
        } else if (source[i] === '$' && source[i + 1] === '{') {
          // An expression inside a template: scan it as code until its closing brace.
          let depth = 1;
          out += '${';
          i += 2;
          let expression = '';
          while (i < n && depth > 0) {
            if (source[i] === '{') depth += 1;
            else if (source[i] === '}') depth -= 1;
            if (depth > 0) expression += source[i];
            i += 1;
          }
          out += stripComments(expression) + '}';
          continue;
        }
        out += source[i] ?? '';
        i += 1;
      }
      out += source[i] ?? '';
      i += 1;
      previousSignificant = '`';
      continue;
    }
    if (c === '/' && next !== '>' && /[(,=:[!&|?{};]|^$/.test(previousSignificant)) {
      // A regular expression literal: copy it through, so a quote inside it does not open a string.
      out += c;
      i += 1;
      let inClass = false;
      while (i < n && source[i] !== '\n') {
        const d = source[i];
        out += d;
        i += 1;
        if (d === '\\') {
          out += source[i] ?? '';
          i += 1;
        } else if (d === '[') inClass = true;
        else if (d === ']') inClass = false;
        else if (d === '/' && !inClass) break;
      }
      previousSignificant = '/';
      continue;
    }
    out += c;
    if (!/\s/.test(c)) previousSignificant = c;
    i += 1;
  }
  return out;
}

/** @returns {{ rule: string, line: number, text: string }[]} */
export function findViolations(source) {
  const lines = stripComments(source).split('\n');
  const found = [];
  lines.forEach((text, index) => {
    for (const rule of RULES) {
      if (rule.test.test(text)) found.push({ rule: rule.id, line: index + 1, text: text.trim().slice(0, 110) });
    }
  });
  return found;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else if (stat.isFile()) yield full;
  }
}

const posix = (file) => relative(ROOT, file).split(sep).join('/');

/** Every `u-*` class a component names, and every one the stylesheet defines. */
export function utilityDrift(componentSources, stylesheet) {
  const defined = new Set([...stylesheet.matchAll(/\.(u-[a-z0-9-]+)\b/g)].map((m) => m[1]));
  const used = new Set();
  for (const source of componentSources) {
    for (const m of source.matchAll(/(?<![\w-])(u-[a-z0-9]+(?:-[a-z0-9]+)*)(?![\w-])/g)) used.add(m[1]);
  }
  return {
    undefinedClasses: [...used].filter((name) => !defined.has(name)).sort(),
    unusedClasses: [...defined].filter((name) => !used.has(name)).sort(),
  };
}

function run() {
  const problems = [];
  const matchedAllowances = new Set();
  let scanned = 0;

  for (const dir of SCAN_DIRS) {
    const absolute = join(ROOT, dir);
    for (const file of walk(absolute)) {
      const path = posix(file);
      if (/\.module\.(?:css|scss|sass)$/.test(path)) {
        problems.push(`${path}  css-module  a CSS module is not a global stylesheet`);
        continue;
      }
      if (!SOURCE.test(file) || SKIP_FILE.test(file)) continue;
      scanned += 1;
      for (const v of findViolations(readFileSync(file, 'utf8'))) {
        const allowance = ALLOWED.find((a) => a.file === path && a.rules.includes(v.rule));
        if (allowance) {
          matchedAllowances.add(`${allowance.file}:${v.rule}`);
          continue;
        }
        const rule = RULES.find((r) => r.id === v.rule);
        problems.push(`${path}:${v.line}  ${v.rule}  ${v.text}\n      ${rule.why}`);
      }
    }
  }

  for (const allowance of ALLOWED) {
    for (const rule of allowance.rules) {
      if (!matchedAllowances.has(`${allowance.file}:${rule}`)) {
        problems.push(`${allowance.file}  allowance for ${rule} matches nothing: remove it from ALLOWED`);
      }
    }
  }

  const storefront = join(ROOT, 'apps/storefront/src');
  const sources = [...walk(storefront)]
    .filter((f) => SOURCE.test(f) && !SKIP_FILE.test(f))
    .map((f) => readFileSync(f, 'utf8'));
  const drift = utilityDrift(sources, readFileSync(join(storefront, 'styles/utility.css'), 'utf8'));
  for (const name of drift.undefinedClasses)
    problems.push(`apps/storefront/src  ${name} is used but styles/utility.css does not define it`);
  for (const name of drift.unusedClasses)
    problems.push(`apps/storefront/src/styles/utility.css  .${name} is defined but used nowhere: remove it`);

  if (problems.length > 0) {
    console.error(`check-global-css: ${problems.length} problem(s) in ${scanned} files\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    console.error('\nAll CSS lives in a global stylesheet. See the header of scripts/check-global-css.mjs.');
    process.exit(1);
  }
  console.log(
    `check-global-css: ${scanned} files, no CSS outside a stylesheet (${ALLOWED.length} documented exceptions).`,
  );
}

/** Proof the matchers still catch what they claim to, and spare what they should. */
function selfTest() {
  const failures = [];
  const expect = (name, ok) => {
    if (!ok) failures.push(name);
  };
  const rules = (source) => findViolations(source).map((v) => v.rule);

  expect('flags a JSX style prop', rules('<div style={{ gap: 4 }} />').includes('style-attr'));
  expect('flags an HTML string style', rules('const h = `<td style="padding:0">`;').includes('style-attr'));
  expect('flags a <style> tag', rules('<style dangerouslySetInnerHTML={{ __html: css }} />').includes('style-tag'));
  expect('flags a style write', rules("document.body.style.overflow = 'hidden';").includes('style-write'));
  expect('flags setProperty on style', rules("el.style.setProperty('--x', '1');").includes('style-write'));
  expect('flags cssText', rules("field.style.cssText = 'a:b';").includes('style-write'));
  expect('flags setAttribute style', rules("el.setAttribute('style', 'a:b');").includes('style-attribute'));
  expect('flags a style object key', rules('const x = { style: { color: red } };').includes('style-key'));
  expect('flags a Recharts style prop', rules('<Tooltip contentStyle={{ border: 0 }} />').includes('style-key'));
  expect('flags next/image', rules("import Image from 'next/image';").includes('next-image'));
  expect('flags styled-components', rules("import styled from 'styled-components';").includes('css-in-js'));
  expect('flags a CSS module', rules("import s from './a.module.css';").includes('css-module'));

  expect('spares a line comment', rules('// the old style={{ gap }} is gone').length === 0);
  expect('spares a block comment', rules('/* <style> tag */ const a = 1;').length === 0);
  expect('spares a JSDoc line', rules('/**\n * el.style.x = 1 used to be here\n */\nconst a = 1;').length === 0);
  expect('spares a variable called style', rules('const style = { a: 1 };').length === 0);
  expect('spares destructuring style away', rules('const { style: _style, ...img } = attrs;').length === 0);
  expect('spares getComputedStyle', rules('const rtl = getComputedStyle(panel).direction;').length === 0);
  expect(
    'keeps a URL in a string from opening a comment',
    rules("const u = 'https://x.test'; el.style.top = 1;").includes('style-write'),
  );
  expect(
    'keeps a glob in a string from opening a comment',
    rules("const g = 'src/**/*.ts'; el.style.top = 1;").includes('style-write'),
  );
  expect('reads the code inside a template expression', rules('const a = `${el.style.top}`;').includes('style-write'));
  expect('keeps line numbers', findViolations('// one\n\n<div style={{}} />')[0].line === 3);

  const drift = utilityDrift(
    ['<div className="stack u-gap-4 u-fs-9" />'],
    '.u-gap-4 { gap: 4px; }\n.u-mt-18 { margin: 0; }',
  );
  expect('finds a utility used but undefined', drift.undefinedClasses.join() === 'u-fs-9');
  expect('finds a utility defined but unused', drift.unusedClasses.join() === 'u-mt-18');

  if (failures.length > 0) {
    console.error(`check-global-css self-test: ${failures.length} failed\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log('check-global-css self-test: ok');
}

if (process.argv.includes('--self-test')) selfTest();
else if (process.argv[1] === fileURLToPath(import.meta.url)) run();
