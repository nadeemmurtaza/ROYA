#!/usr/bin/env node
/**
 * Publish the build's static assets where the back office asks for them.
 *
 * next.config.mjs sets `assetPrefix: '/admin'` so the back office's scripts and
 * styles live under /admin/_next and cannot collide with the storefront's /_next
 * when both share one domain. OpenNext writes the files to `.open-next/assets/_next`
 * only, and Workers Assets answers a request from a file with that exact path, so
 * /admin/_next/... would fall through to the Next server (a 404 page served as
 * text/html, which the browser refuses as a script). Copy the folder under the prefix.
 *
 * Run after `opennextjs-cloudflare build` (the `cf:build` script does).
 */
import { cpSync, existsSync, rmSync } from 'node:fs';

const source = '.open-next/assets/_next';
const target = '.open-next/assets/admin/_next';

if (!existsSync(source)) {
  console.error(`cf-assets: ${source} not found; run opennextjs-cloudflare build first.`);
  process.exit(1);
}
rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`cf-assets: copied ${source} -> ${target}`);
