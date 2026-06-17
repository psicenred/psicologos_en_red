#!/usr/bin/env node
/**
 * Compara rutas API de server.js (legacy) con app/api en Next.
 * Uso: node scripts/check-api-parity.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function normalizeLegacyRoute(method, route) {
  let r = route.replace(/^\//, '');
  r = r.replace(/:([a-zA-Z]+)/g, '[$1]');
  if (r.startsWith('webhook/stripe')) return 'POST /api/webhook/stripe';
  if (!r.startsWith('api/')) return null;
  return `${method.toUpperCase()} /${r}`;
}

function collectLegacyRoutes() {
  const src = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const re = /app\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/g;
  const routes = new Set();
  let m;
  while ((m = re.exec(src)) !== null) {
    const normalized = normalizeLegacyRoute(m[1], m[2]);
    if (normalized) routes.add(normalized);
  }
  return routes;
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

const legacy = collectLegacyRoutes();
const next = collectNextRoutes();

const missing = [...legacy].filter((r) => !next.has(r)).sort();
const extra = [...next].filter((r) => !legacy.has(r)).sort();

console.log(`Legacy API routes: ${legacy.size}`);
console.log(`Next API routes:   ${next.size}\n`);

if (missing.length === 0) {
  console.log('✓ Paridad completa: todas las rutas legacy /api/* están en Next.\n');
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
