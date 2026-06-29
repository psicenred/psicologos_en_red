import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  interpretRegistroResponse,
  parseRegistroPayload,
} from './registro-response.ts';

/** Lógica desplegada en main antes del fix (regresión). */
function interpretRegistroResponseLegacy(input: {
  status: number;
  redirected: boolean;
  url: string;
  type: string;
  payload: { ok?: boolean; redirect?: string } | null;
}): 'success' | 'error' {
  const llegoAExito =
    input.redirected ||
    /registro-exitoso/i.test(input.url) ||
    input.type === 'opaqueredirect';
  if (llegoAExito) return 'success';

  if (input.status >= 200 && input.status < 300 && input.payload?.ok && input.payload.redirect) {
    return 'success';
  }

  return 'error';
}

describe('interpretRegistroResponse', () => {
  it('éxito: JSON { ok: true, redirect } con Accept: application/json', () => {
    const r = interpretRegistroResponse({
      status: 200,
      redirected: false,
      url: 'https://psicologos-en-red.vercel.app/registrar-usuario',
      type: 'basic',
      payload: { ok: true, redirect: '/registro-exitoso' },
    });
    assert.equal(r.kind, 'success');
    if (r.kind === 'success') assert.equal(r.redirect, '/registro-exitoso');
  });

  it('éxito: JSON { ok: true } sin redirect (usa default)', () => {
    const r = interpretRegistroResponse({
      status: 200,
      redirected: false,
      url: 'https://example.com/registrar-usuario',
      type: 'basic',
      payload: { ok: true },
    });
    assert.equal(r.kind, 'success');
    if (r.kind === 'success') assert.equal(r.redirect, '/registro-exitoso');
  });

  it('regresión: legacy exigía redirect en payload — fallaba con { ok: true } solo', () => {
    const legacy = interpretRegistroResponseLegacy({
      status: 200,
      redirected: false,
      url: 'https://example.com/registrar-usuario',
      type: 'basic',
      payload: { ok: true },
    });
    assert.equal(legacy, 'error', 'el código viejo mostraba "No se pudo completar el registro."');

    const fixed = interpretRegistroResponse({
      status: 200,
      redirected: false,
      url: 'https://example.com/registrar-usuario',
      type: 'basic',
      payload: { ok: true },
    });
    assert.equal(fixed.kind, 'success');
  });

  it('éxito: redirect 303 sin seguir (opaqueredirect / status 0)', () => {
    const r = interpretRegistroResponse({
      status: 0,
      redirected: false,
      url: 'https://psicologos-en-red.vercel.app/registrar-usuario',
      type: 'opaqueredirect',
      payload: null,
    });
    assert.equal(r.kind, 'success');
  });

  it('éxito: redirect 303 explícito', () => {
    const r = interpretRegistroResponse({
      status: 303,
      redirected: false,
      url: 'https://psicologos-en-red.vercel.app/registrar-usuario',
      type: 'basic',
      payload: null,
    });
    assert.equal(r.kind, 'success');
  });

  it('éxito: fetch siguió redirect a registro-exitoso (servidor legacy)', () => {
    const r = interpretRegistroResponse({
      status: 200,
      redirected: true,
      url: 'https://psicologos-en-red.vercel.app/registro-exitoso',
      type: 'basic',
      payload: null,
    });
    assert.equal(r.kind, 'success');
  });

  it('error: JSON correo duplicado', () => {
    const r = interpretRegistroResponse({
      status: 409,
      redirected: false,
      url: 'https://psicologos-en-red.vercel.app/registrar-usuario',
      type: 'basic',
      payload: {
        ok: false,
        code: 'EMAIL_EXISTS',
        error: 'Este correo ya está registrado.',
      },
    });
    assert.equal(r.kind, 'error');
    if (r.kind === 'error') assert.equal(r.code, 'EMAIL_EXISTS');
  });

  it('error: respuesta vacía sin señales de éxito (falso negativo imposible de distinguir)', () => {
    const r = interpretRegistroResponse({
      status: 200,
      redirected: false,
      url: 'https://psicologos-en-red.vercel.app/registrar-usuario',
      type: 'basic',
      payload: null,
    });
    assert.equal(r.kind, 'error');
    if (r.kind === 'error') assert.equal(r.code, 'UNKNOWN');
  });
});

describe('parseRegistroPayload', () => {
  it('parsea JSON aunque falte content-type (bug CDN/proxy)', async () => {
    const res = new Response(JSON.stringify({ ok: true, redirect: '/registro-exitoso' }), {
      status: 200,
      headers: {},
    });
    const payload = await parseRegistroPayload(res);
    assert.deepEqual(payload, { ok: true, redirect: '/registro-exitoso' });
  });

  it('regresión: sin content-type el formulario legacy dejaba payload null', async () => {
    const res = new Response(JSON.stringify({ ok: true, redirect: '/registro-exitoso' }), {
      status: 200,
      headers: {},
    });
    const contentType = res.headers.get('content-type') || '';
    assert.ok(!contentType.includes('application/json'));

    const payload = await parseRegistroPayload(res);
    assert.equal(payload?.ok, true);

    const legacyWouldFail = interpretRegistroResponseLegacy({
      status: res.status,
      redirected: false,
      url: 'https://example.com/registrar-usuario',
      type: res.type,
      payload: null,
    });
    assert.equal(legacyWouldFail, 'error');
  });
});
