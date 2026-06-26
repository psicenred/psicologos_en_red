export type SecurityEventType =
  | 'auth_failure'
  | 'auth_success'
  | 'rate_limit'
  | 'access_denied'
  | 'webhook_error'
  | 'webhook_invalid'
  | 'crypto_misconfig';

export function logSecurityEvent(
  type: SecurityEventType,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const entry = {
    level: 'security',
    type,
    message,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  console.error(JSON.stringify(entry));
}

export function logSecurityWarn(
  type: SecurityEventType,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  const entry = {
    level: 'security',
    type,
    message,
    timestamp: new Date().toISOString(),
    ...metadata,
  };
  console.warn(JSON.stringify(entry));
}
