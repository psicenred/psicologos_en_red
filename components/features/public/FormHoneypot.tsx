'use client';

import { HONEYPOT_FIELD_NAME } from '@/lib/security/honeypot';

/**
 * Campo trampa para bots: oculto fuera de pantalla (no display:none ni type=hidden).
 */
export function FormHoneypot() {
  return (
    <div
      className="form-honeypot"
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      <label htmlFor={HONEYPOT_FIELD_NAME}>Company URL</label>
      <input
        type="text"
        id={HONEYPOT_FIELD_NAME}
        name={HONEYPOT_FIELD_NAME}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}
