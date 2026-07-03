'use server';

import { redirect } from 'next/navigation';
import { createAcademiaServerClient } from '@/lib/academia/supabase/server';

export async function academiaLogoutAction(): Promise<never> {
  const supabase = await createAcademiaServerClient();
  await supabase.auth.signOut();
  redirect('/academia/login');
}
