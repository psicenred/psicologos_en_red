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
              new Error(String(json.error || json.message || `Daily API ${res.statusCode}`)),
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

export async function createCourseLiveRoom(sessionId: string): Promise<{
  url: string;
  name: string;
} | null> {
  if (!DAILY_API_KEY) return null;

  const roomName = `curso-${sessionId.replace(/-/g, '').slice(0, 20)}`;
  const now = Math.floor(Date.now() / 1000);
  const expRoom = now + 7 * 24 * 3600;

  let room = await dailyApi('GET', 'rooms/' + encodeURIComponent(roomName)).catch(() => null);
  if (!room?.url) {
    const recordingEnabled = process.env.DAILY_COURSE_RECORDING === 'true';
    room = await dailyApi('POST', 'rooms', {
      name: roomName,
      privacy: 'private',
      properties: {
        exp: expRoom,
        nbf: now - 60,
        ...(recordingEnabled ? { enable_recording: 'cloud' } : {}),
      },
    });
  }

  if (!room?.url) return null;
  return { url: String(room.url), name: String(room.name || roomName) };
}

export async function createCourseMeetingToken(params: {
  roomName: string;
  userId: string;
  userName: string;
  isOwner?: boolean;
}): Promise<string | null> {
  if (!DAILY_API_KEY) return null;

  const now = Math.floor(Date.now() / 1000);
  const tokenRes = await dailyApi('POST', 'meeting-tokens', {
    properties: {
      room_name: params.roomName,
      user_name: params.userName.slice(0, 100),
      user_id: params.userId.slice(0, 36),
      is_owner: Boolean(params.isOwner),
      exp: now + 3 * 3600,
      lang: 'es',
    },
  });

  return tokenRes?.token ? String(tokenRes.token) : null;
}

export async function listRoomRecordings(roomName: string): Promise<
  { download_link?: string; share_token?: string; status?: string }[]
> {
  if (!DAILY_API_KEY) return [];

  const res = await dailyApi(
    'GET',
    `recordings?room_name=${encodeURIComponent(roomName)}`,
  ).catch(() => null);

  const data = (res?.data as Record<string, unknown>[] | undefined) ?? [];
  return data.map((r) => ({
    download_link: r.download_link ? String(r.download_link) : undefined,
    share_token: r.share_token ? String(r.share_token) : undefined,
    status: r.status ? String(r.status) : undefined,
  }));
}
