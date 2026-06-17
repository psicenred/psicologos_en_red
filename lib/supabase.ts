import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let serviceClient: SupabaseClient | undefined;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Variable de entorno requerida: ${name}`);
  }
  return value;
}

/** Cliente Supabase con service role (servidor). RLS desactivado en fases iniciales. */
export function getSupabaseServiceClient(): SupabaseClient {
  if (!serviceClient) {
    serviceClient = createClient(
      requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
      requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return serviceClient;
}

/** Comprueba que las variables de Supabase estén presentes sin crear el cliente. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}
