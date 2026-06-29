#!/usr/bin/env node
/**
 * Prueba de contrato POST /registrar-usuario (éxito + correo duplicado).
 *
 * Uso:
 *   npm run test:registro
 *   node scripts/test-registro-flow.mjs https://psicologos-en-red.vercel.app --cleanup
 *
 * Requiere DATABASE_URL con --cleanup para borrar usuarios de prueba.
 */
import 'dotenv/config';
import { interpretRegistroResponse, parseRegistroPayload } from '../lib/auth/registro-response.ts';

const args = process.argv.slice(2).filter((a) => a !== '--cleanup');
const cleanup = process.argv.includes('--cleanup');
const base = (args[0] || process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const password = 'Test1234!';
const createdEmails = [];

function uniqueEmail(tag) {
  const email = `registro-test-${tag}-${Date.now()}@psic-en-red.test`;
  createdEmails.push(email);
  return email;
}

function buildBody(email, extra = {}) {
  return new URLSearchParams({
    nombre: 'Registro Test',
    email,
    password,
    telefono: '+525512345678',
    rol: 'paciente',
    acepto_terminos: 'on',
    ...extra,
  });
}

function assertSuccess(label, res, payload) {
  const result = interpretRegistroResponse({
    status: res.status,
    redirected: res.redirected,
    url: res.url,
    type: res.type,
    payload,
  });
  if (result.kind !== 'success') {
    console.error(`✗ ${label}: se esperaba success, got`, result, {
      status: res.status,
      redirected: res.redirected,
      url: res.url,
      type: res.type,
      contentType: res.headers.get('content-type'),
      payload,
    });
    process.exit(1);
  }
  console.log(`✓ ${label} → success (${result.redirect})`);
}

function assertErrorCode(label, res, payload, expectedCode) {
  const result = interpretRegistroResponse({
    status: res.status,
    redirected: res.redirected,
    url: res.url,
    type: res.type,
    payload,
  });
  if (result.kind !== 'error' || result.code !== expectedCode) {
    console.error(`✗ ${label}: se esperaba ${expectedCode}, got`, result);
    process.exit(1);
  }
  console.log(`✓ ${label} → ${expectedCode}`);
}

async function postRegistro(body, headers = {}) {
  return fetch(`${base}/registrar-usuario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    },
    body,
    redirect: headers.redirect ?? 'follow',
  });
}

console.log(`Test registro → ${base}\n`);

// 1) Contrato JSON (como el formulario del navegador)
{
  const email = uniqueEmail('json');
  const res = await postRegistro(buildBody(email), { Accept: 'application/json' });
  const payload = await parseRegistroPayload(res);
  assertSuccess('Accept: application/json', res, payload);

  if (payload?.ok !== true && !res.redirected && res.status < 300) {
    console.error('✗ Accept: application/json: se esperaba payload JSON con ok:true', {
      status: res.status,
      redirected: res.redirected,
      contentType: res.headers.get('content-type'),
      payload,
    });
    process.exit(1);
  }
}

// 2) Registro con código referido (?ref=...)
{
  const email = uniqueEmail('ref');
  const res = await postRegistro(buildBody(email, { ref_code: '9B4A5ESA' }), {
    Accept: 'application/json',
  });
  const payload = await parseRegistroPayload(res);
  assertSuccess('registro con ref_code', res, payload);
}

// 3) Legacy 303 con email nuevo (sin Accept)
{
  const email = uniqueEmail('legacy303');
  const res = await postRegistro(buildBody(email), { redirect: 'follow' });
  const payload = await parseRegistroPayload(res);
  assertSuccess('redirect follow (legacy 303)', res, payload);
}

// 4) Correo duplicado → EMAIL_EXISTS (JSON)
{
  const email = uniqueEmail('dup');
  await postRegistro(buildBody(email), { Accept: 'application/json' });
  const res = await postRegistro(buildBody(email), { Accept: 'application/json' });
  const payload = await parseRegistroPayload(res);
  assertErrorCode('duplicate email', res, payload, 'EMAIL_EXISTS');
}

if (cleanup && process.env.DATABASE_URL) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  for (const email of createdEmails) {
    const uid = (
      await pool.query('SELECT id FROM usuarios WHERE LOWER(email)=LOWER($1)', [email])
    ).rows[0]?.id;
    if (uid) {
      await pool.query('DELETE FROM referidos WHERE referido_user_id = $1', [uid]);
      await pool.query('DELETE FROM usuarios WHERE id = $1', [uid]);
      console.log(`🧹 Borrado ${email} (id ${uid})`);
    }
  }
  await pool.end();
} else if (cleanup) {
  console.warn('\n⚠ --cleanup omitido: falta DATABASE_URL');
  console.warn('Emails creados:', createdEmails.join(', '));
}

console.log('\nRegistro flow OK');
