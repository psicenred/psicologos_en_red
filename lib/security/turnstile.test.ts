import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { isTurnstileConfigured, verifyTurnstileToken } from './turnstile.ts';

describe('turnstile', () => {
  const prevSecret = process.env.TURNSTILE_SECRET_KEY;
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (prevSecret === undefined) delete process.env.TURNSTILE_SECRET_KEY;
    else process.env.TURNSTILE_SECRET_KEY = prevSecret;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
  });

  it('isTurnstileConfigured refleja el secret', () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(isTurnstileConfigured(), false);
    process.env.TURNSTILE_SECRET_KEY = '  test-secret  ';
    assert.equal(isTurnstileConfigured(), true);
  });

  it('sin secret acepta cualquier token (modo local)', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    process.env.NODE_ENV = 'development';
    const r = await verifyTurnstileToken(undefined);
    assert.equal(r.ok, true);
  });

  it('con secret rechaza token vacío', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'test-secret';
    const r = await verifyTurnstileToken('');
    assert.equal(r.ok, false);
    if (!r.ok) assert.match(r.error, /CAPTCHA/i);
  });
});
