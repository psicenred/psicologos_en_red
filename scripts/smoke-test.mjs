#!/usr/bin/env node
/**
 * Smoke test de endpoints públicos Next.js.
 * Uso: node scripts/smoke-test.mjs [BASE_URL]
 * Ejemplo: node scripts/smoke-test.mjs http://localhost:3000
 */
import 'dotenv/config';

const base = (process.argv[2] || process.env.BASE_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const PUBLIC_GET = [
  '/api/health',
  '/api/psicologos',
  '/api/blog-articulos',
  '/api/diplomados',
  '/api/testimonios-encuesta',
  '/api/precio-region',
  '/api/config/video-boton-15min',
  '/api/jaas-config',
  '/api/estado-sesion',
];

async function check(path) {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, { redirect: 'manual' });
    const ok = res.status >= 200 && res.status < 500;
    return { path, status: res.status, ok };
  } catch (err) {
    return { path, status: 0, ok: false, error: (err).message };
  }
}

console.log(`Smoke test → ${base}\n`);

const results = await Promise.all(PUBLIC_GET.map(check));
let failed = 0;

for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  const extra = r.error ? ` (${r.error})` : '';
  console.log(`${mark} ${r.path} → ${r.status}${extra}`);
  if (!r.ok) failed++;
}

console.log(`\n${results.length - failed}/${results.length} OK`);

if (failed > 0) {
  process.exit(1);
}
