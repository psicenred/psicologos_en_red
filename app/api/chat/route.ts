import { NextResponse } from 'next/server';
import { databaseUnavailableJson, parseJsonBody } from '@/lib/auth/api';
import { handleGroqChat } from '@/lib/chat/groq';
import { isDatabaseConfigured } from '@/lib/db';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    bucket: 'chat:public',
    limit: 30,
    windowSec: 3600,
  });
  if (limited) return limited;

  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const body = await parseJsonBody<{
    message?: string;
    history?: { role?: string; content?: string }[];
  }>(request);

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 });
  }

  if (body.message.length > 4000) {
    return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 });
  }

  try {
    const result = await handleGroqChat(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/chat:', error);
    return NextResponse.json(
      { error: 'Error al procesar mensaje' },
      { status: 400 },
    );
  }
}
