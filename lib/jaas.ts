import jwt from 'jsonwebtoken';

export function limpiaEnv(value: string | undefined): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\\n/g, '').replace(/\s+/g, '').trim();
}

export function getJaasAppId(): string {
  return limpiaEnv(process.env.JAAS_APP_ID);
}

export function createJaasJwt(options: {
  userId: number;
  displayName: string;
  email: string;
  moderator: boolean;
}): string {
  const appId = getJaasAppId();
  const kid = limpiaEnv(process.env.JAAS_KID);
  let privateKey = (process.env.JAAS_PRIVATE_KEY || '').trim();

  if (!appId || !kid || !privateKey) {
    throw new Error(
      'JaaS JWT no configurado (JAAS_APP_ID, JAAS_KID, JAAS_PRIVATE_KEY)',
    );
  }

  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: appId,
    room: '*',
    exp: now + 7200,
    nbf: now - 10,
    context: {
      user: {
        id: String(options.userId),
        name: options.displayName,
        email: options.email,
        moderator: options.moderator ? 'true' : 'false',
      },
      features: {
        livestreaming: 'false',
        recording: 'false',
        transcription: 'false',
        'outbound-call': 'false',
        'sip-outbound-call': 'false',
      },
      room: { regex: false },
    },
  };

  return jwt.sign(payload, privateKey, { algorithm: 'RS256', keyid: kid });
}
