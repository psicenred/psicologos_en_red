import 'server-only';

import { normalizeRol } from '@/lib/auth/api';
import { verifyAdminMutationToken } from '@/lib/admin/mutation-token';
import { query } from '@/lib/db';

export async function verifyAdminMutationInDb(token: string): Promise<number | null> {
  const adminUserId = verifyAdminMutationToken(token);
  if (!adminUserId) return null;

  try {
    const result = await query('SELECT rol FROM usuarios WHERE id = $1', [adminUserId]);
    if (result.rows.length === 0) return null;
    const rol = (result.rows[0] as { rol: string }).rol;
    if (normalizeRol(rol) !== 'admin') return null;
    return adminUserId;
  } catch {
    return null;
  }
}
