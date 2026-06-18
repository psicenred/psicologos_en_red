import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';

export async function GET(request: Request) {
  const auth = await requireAuthUsuario(request);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ id: auth.id });
}
