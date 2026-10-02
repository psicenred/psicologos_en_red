import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isHoneypotTriggered } from './honeypot.ts';
import { normalizeEmailForRateLimit } from './normalize-email.ts';

describe('normalizeEmailForRateLimit', () => {
  it('pasa a minúsculas y trim', () => {
    assert.equal(normalizeEmailForRateLimit('  Foo@Bar.COM '), 'foo@bar.com');
  });

  it('en gmail quita puntos y alias +', () => {
    assert.equal(
      normalizeEmailForRateLimit('j.o.e+spam@gmail.com'),
      'joe@gmail.com',
    );
  });

  it('no altera puntos en otros dominios', () => {
    assert.equal(
      normalizeEmailForRateLimit('j.o.e+spam@outlook.com'),
      'j.o.e+spam@outlook.com',
    );
  });
});

describe('honeypot', () => {
  it('vacío / espacios no dispara', () => {
    assert.equal(isHoneypotTriggered(''), false);
    assert.equal(isHoneypotTriggered('   '), false);
    assert.equal(isHoneypotTriggered(null), false);
    assert.equal(isHoneypotTriggered(undefined), false);
  });

  it('cualquier valor dispara', () => {
    assert.equal(isHoneypotTriggered('http://spam'), true);
    assert.equal(isHoneypotTriggered('x'), true);
  });
});
