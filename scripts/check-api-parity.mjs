#!/usr/bin/env node
/**
 * Compara rutas API de referencia (baseline) con app/api en Next.
 * Uso: node scripts/check-api-parity.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function collectBaselineRoutes() {
  const baselinePath = path.join(root, 'scripts/api-baseline.json');
  if (!fs.existsSync(baselinePath)) {
    console.error('✗ Falta scripts/api-baseline.json');
    process.exit(1);
  }
  return new Set(JSON.parse(fs.readFileSync(baselinePath, 'utf8')));
}

function collectNextRoutes(dir = path.join(root, 'app/api'), prefix = '/api') {
  const routes = new Set();
  if (!fs.existsSync(dir)) return routes;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const segment =
        entry.name.startsWith('[') && entry.name.endsWith(']')
          ? `[${entry.name.slice(1, -1)}]`
          : entry.name;
      for (const r of collectNextRoutes(full, `${prefix}/${segment}`)) {
        routes.add(r);
      }
    } else if (entry.name === 'route.ts') {
      const content = fs.readFileSync(full, 'utf8');
      for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']) {
        if (new RegExp(`export\\s+(async\\s+)?function\\s+${method}\\b`).test(content)) {
          routes.add(`${method} ${prefix}`);
        }
      }
    }
  }
  return routes;
}

const baseline = collectBaselineRoutes();
const next = collectNextRoutes();

const missing = [...baseline].filter((r) => !next.has(r)).sort();
const extra = [...next].filter((r) => !baseline.has(r)).sort();

console.log(`Baseline API routes: ${baseline.size}`);
console.log(`Next API routes:     ${next.size}\n`);

if (missing.length === 0) {
  console.log('✓ Paridad completa: todas las rutas baseline /api/* están en Next.\n');
} else {
  console.log(`✗ Faltan en Next (${missing.length}):`);
  for (const r of missing) console.log(`  - ${r}`);
  console.log('');
}

if (extra.length > 0) {
  console.log(`Rutas solo en Next (${extra.length}):`);
  for (const r of extra) console.log(`  + ${r}`);
  console.log('');
}

process.exit(missing.length > 0 ? 1 : 0);
