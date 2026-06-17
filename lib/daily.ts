import https from 'https';

const DAILY_API_KEY = (process.env.DAILY_API_KEY || '').trim();

function dailyApi(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    const pathname = path.startsWith('/v1/')
      ? path
      : '/v1/' + path.replace(/^\//, '');
    const data = body ? JSON.stringify(body) : '';
    const opts: https.RequestOptions = {
      hostname: 'api.daily.co',
      path: pathname,
      method,
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data, 'utf8') } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let chunks = '';
      res.on('data', (c) => {
        chunks += c;
      });
      res.on('end', () => {
        const bodyText = (chunks || '').trim();
        if (method === 'GET' && res.statusCode === 404) {
          resolve(null);
          return;
        }
        try {
          const json = bodyText ? JSON.parse(bodyText) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json as Record<string, unknown>);
          } else {
            reject(
              new Error(
                String(json.error || json.message || `Daily API ${res.statusCode}`),
              ),
            );
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

export async function createDailyMeeting(params: {
  citaId: number | string;
  rol: string;
  displayName?: string;
  userId: number;
  userName?: string;
}): Promise<{ url: string; token: string } | { error: string }> {
  if (!DAILY_API_KEY) {
    return { error: 'Videollamadas no configuradas (DAILY_API_KEY)' };
  }

  const citaIdNum = parseInt(String(params.citaId), 10);
  const roomName =
    ('sesion-' + (Number.isNaN(citaIdNum) ? Date.now() : citaIdNum)).replace(
      /[^A-Za-z0-9_-]/g,
      '',
    ) || 'sesion-' + Math.floor(Date.now() / 1000);
  const isOwner = params.rol === 'psicologo';
  const name = (params.displayName || params.userName || 'Usuario')
    .trim()
    .slice(0, 100);
  const userId = String(params.userId).slice(0, 36);
  const now = Math.floor(Date.now() / 1000);
  const expRoom = now + 4 * 3600;
  const expToken = now + 2 * 3600;

  let room = await dailyApi('GET', 'rooms/' + encodeURIComponent(roomName)).catch(
    () => null,
  );
  if (!room || !room.url) {
    room = await dailyApi('POST', 'rooms', {
      name: roomName,
      privacy: 'private',
      properties: { exp: expRoom, nbf: now - 60 },
    });
  }
  if (!room || !room.url) {
    return { error: 'No se pudo crear la sala de video' };
  }

  const tokenRes = await dailyApi('POST', 'meeting-tokens', {
    properties: {
      room_name: room.name,
      user_name: name,
      user_id: userId,
      is_owner: isOwner,
      exp: expToken,
      lang: 'es',
    },
  });

  return {
    url: String(room.url),
    token: String(tokenRes?.token || ''),
  };
}
