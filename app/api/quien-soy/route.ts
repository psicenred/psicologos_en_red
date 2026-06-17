import { NextResponse } from 'next/server';
import { requireAuthUsuario } from '@/lib/auth/api';

export async function GET() {
  const auth = await requireAuthUsuario();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ id: auth.id });
}
