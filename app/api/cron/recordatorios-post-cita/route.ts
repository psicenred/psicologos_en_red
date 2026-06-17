import { NextResponse } from 'next/server';
import { databaseUnavailableJson } from '@/lib/auth/api';
import { ejecutarRecordatoriosPostCita } from '@/lib/citas/recordatorios';
import { verifyCronSecret } from '@/lib/cron/auth';
import { isDatabaseConfigured } from '@/lib/db';

export const runtime = 'nodejs';

async function run() {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();
  const result = await ejecutarRecordatoriosPostCita();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(request: Request) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;
  return run();
}

export async function POST(request: Request) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;
  return run();
}
