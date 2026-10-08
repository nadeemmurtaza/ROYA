#!/usr/bin/env node
/**
 * The root `vercel.json` stays consistent with itself and with the repository.
 *
 * Vercel reads it to deploy the storefront, the back office and the API as
 * services of one project. A typo in it is not caught until a deploy, so the
 * parts that can be known without Vercel are checked here:
 *
 *   top-level-key   a build setting at the top level (`buildCommand`,
 *                   `framework`, `functions` …); in services mode these belong
 *                   to a service
 *   service-root    a service whose `root` is not a folder with a package.json
 *   rewrite-target  a rewrite to a service that is not declared
 *   rewrite-order   a catch-all rewrite that is not last, which would shadow
 *                   every rewrite after it, or no catch-all at all
 *   binding-shape   a binding missing one of `type`, `service`, `format`, `env`,
 *                   or one that names an unknown service or the service itself
 *   binding-env     two bindings on one service with the same variable, or a
 *                   variable that is not UPPER_SNAKE_CASE
 *
 * What it cannot see is how Vercel forwards a path or what a binding resolves
 * to; docs/OPEN-QUESTIONS.md lists what a first deploy has to confirm.
 *
 * Usage: node scripts/check-vercel-config.mjs [--self-test]
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Build settings that move into a service once `services` is set. */
const SERVICE_ONLY_KEYS = [
  'functions',
  'installCommand',
  'buildCommand',
  'devCommand',
  'ignoreCommand',
  'outputDirectory',
  'framework',
];

const BINDING_FIELDS = ['type', 'service', 'format', 'env'];

/** A source that matches every path, so nothing after it can ever be reached. */
const isCatchAll = (source) => ['/(.*)', '/:path*', '/:path(.*)', '/(.*)*'].includes(source);

/**
 * @param {Record<string, any>} config the parsed vercel.json
 * @param {(root: string) => boolean} rootExists whether a service root holds a package.json
 * @returns {{ id: string, message: string }[]}
 */
export function validate(config, rootExists) {
  const problems = [];
  const add = (id, message) => problems.push({ id, message });

  const services = config.services && typeof config.services === 'object' ? config.services : {};
  if (Object.keys(services).length === 0) add('service-root', 'no services are declared');

  for (const key of SERVICE_ONLY_KEYS) {
    if (key in config) add('top-level-key', `"${key}" is invalid at the top level in services mode; move it into a service`);
  }

  for (const [name, service] of Object.entries(services)) {
    if (!service?.root || !rootExists(service.root)) {
      add('service-root', `service "${name}": root "${service?.root}" is not a folder with a package.json`);
    }
    const seenEnv = new Set();
    for (const binding of service?.bindings ?? []) {
      const missing = BINDING_FIELDS.filter((field) => !binding?.[field]);
      if (missing.length > 0) add('binding-shape', `service "${name}": a binding is missing ${missing.join(', ')}`);
      if (binding?.service && !(binding.service in services)) {
        add('binding-shape', `service "${name}": binding targets unknown service "${binding.service}"`);
      }
      if (binding?.service === name) add('binding-shape', `service "${name}": binds to itself`);
      if (binding?.env) {
        if (!/^[A-Z][A-Z0-9_]*$/.test(binding.env)) add('binding-env', `service "${name}": "${binding.env}" is not UPPER_SNAKE_CASE`);
        if (seenEnv.has(binding.env)) add('binding-env', `service "${name}": "${binding.env}" is bound twice`);
        seenEnv.add(binding.env);
      }
    }
  }

  const rewrites = Array.isArray(config.rewrites) ? config.rewrites : [];
  rewrites.forEach((rewrite, index) => {
    const target = rewrite?.destination?.service;
    if (target && !(target in services)) add('rewrite-target', `rewrite "${rewrite.source}": unknown service "${target}"`);
    if (isCatchAll(rewrite?.source) && index !== rewrites.length - 1) {
      add('rewrite-order', `catch-all "${rewrite.source}" is not last, so every rewrite after it is unreachable`);
    }
  });
  if (rewrites.length > 0 && !isCatchAll(rewrites[rewrites.length - 1]?.source)) {
    add('rewrite-order', 'the last rewrite is not a catch-all, so some paths reach no service');
  }

  return problems;
}

function run() {
  const file = join(ROOT, 'vercel.json');
  let config;
  try {
    config = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`check-vercel-config: vercel.json is missing or not valid JSON (${error.message})`);
    process.exit(1);
  }
  const problems = validate(config, (root) => existsSync(join(ROOT, root, 'package.json')));
  if (problems.length > 0) {
    console.error(`check-vercel-config: ${problems.length} problem(s)\n  ${problems.map((p) => `${p.id}: ${p.message}`).join('\n  ')}`);
    process.exit(1);
  }
  console.log(`check-vercel-config: ok (${Object.keys(config.services).length} services, ${config.rewrites.length} rewrites)`);
}

function selfTest() {
  const failures = [];
  const expect = (name, ok) => {
    if (!ok) failures.push(name);
  };
  const exists = () => true;
  const base = () => ({
    services: {
      web: { root: 'apps/web', bindings: [{ type: 'service', service: 'api', format: 'url', env: 'API_URL' }] },
      api: { root: 'apps/api' },
    },
    rewrites: [
      { source: '/api/:path*', destination: { service: 'api' } },
      { source: '/(.*)', destination: { service: 'web' } },
    ],
  });
  const ids = (config, rootExists = exists) => validate(config, rootExists).map((p) => p.id);

  expect('accepts a sound config', ids(base()).length === 0);
  expect('catches a build setting at the top level', ids({ ...base(), buildCommand: 'x' }).includes('top-level-key'));
  expect('catches a service root that is not there', ids(base(), () => false).includes('service-root'));
  expect(
    'catches a rewrite to an unknown service',
    ids({ ...base(), rewrites: [{ source: '/(.*)', destination: { service: 'ghost' } }] }).includes('rewrite-target'),
  );
  expect(
    'catches a catch-all that shadows the rewrites after it',
    ids({
      ...base(),
      rewrites: [
        { source: '/(.*)', destination: { service: 'web' } },
        { source: '/api/:path*', destination: { service: 'api' } },
      ],
    }).includes('rewrite-order'),
  );
  expect(
    'catches rewrites with no catch-all',
    ids({ ...base(), rewrites: [{ source: '/api/:path*', destination: { service: 'api' } }] }).includes('rewrite-order'),
  );
  const withBinding = (binding) => {
    const config = base();
    config.services.web.bindings = [binding];
    return ids(config);
  };
  expect('catches a binding missing a field', withBinding({ type: 'service', service: 'api', format: 'url' }).includes('binding-shape'));
  expect('catches a binding to an unknown service', withBinding({ type: 'service', service: 'ghost', format: 'url', env: 'X_URL' }).includes('binding-shape'));
  expect('catches a binding to itself', withBinding({ type: 'service', service: 'web', format: 'url', env: 'X_URL' }).includes('binding-shape'));
  expect('catches a variable that is not UPPER_SNAKE_CASE', withBinding({ type: 'service', service: 'api', format: 'url', env: 'apiUrl' }).includes('binding-env'));

  if (failures.length > 0) {
    console.error(`check-vercel-config self-test: ${failures.length} failed\n  ${failures.join('\n  ')}`);
    process.exit(1);
  }
  console.log('check-vercel-config self-test: ok');
}

if (process.argv.includes('--self-test')) selfTest();
else if (process.argv[1] === fileURLToPath(import.meta.url)) run();
