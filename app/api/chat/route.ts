import { NextResponse } from 'next/server';
import { databaseUnavailableJson, parseJsonBody } from '@/lib/auth/api';
import { handleGroqChat } from '@/lib/chat/groq';
import { isDatabaseConfigured } from '@/lib/db';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const body = await parseJsonBody<{
    message?: string;
    history?: { role?: string; content?: string }[];
  }>(request);

  if (!body.message || typeof body.message !== 'string') {
    return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 });
  }

  try {
    const result = await handleGroqChat(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/chat:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Error al procesar mensaje' },
      { status: 400 },
    );
  }
}
