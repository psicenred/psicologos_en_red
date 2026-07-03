import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/auth';
import { processOverdueCoursePayments } from '@/lib/academia/overdue';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const denied = verifyCronSecret(request);
  if (denied) return denied;

  try {
    const result = await processOverdueCoursePayments();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
