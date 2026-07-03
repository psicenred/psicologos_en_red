import { getSupabaseServiceClient } from '@/lib/supabase';

export type AdminInstructorListItem = {
  id: string;
  full_name: string | null;
  status: string;
  email: string | null;
  revenue_share_pct: number;
  created_at: string;
};

export async function listAdminInstructors(): Promise<AdminInstructorListItem[]> {
  const db = getSupabaseServiceClient();
  const { data: profiles, error } = await db
    .from('course_instructor_profiles')
    .select('id, full_name, status, revenue_share_pct, created_at')
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data: authData } = await db.auth.admin.getUserById(p.id);
      return {
        id: p.id,
        full_name: p.full_name,
        status: p.status,
        revenue_share_pct: Number(p.revenue_share_pct ?? 70),
        created_at: p.created_at,
        email: authData.user?.email ?? null,
      };
    }),
  );

  return rows;
}

export async function adminCreateInstructor(input: {
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  revenueSharePct?: number;
}): Promise<AdminInstructorListItem> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const password = input.password;

  if (!email || !fullName || !password) {
    throw new Error('Correo, nombre y contraseña son obligatorios');
  }
  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }

  const db = getSupabaseServiceClient();
  const revenueSharePct = input.revenueSharePct ?? 70;

  if (revenueSharePct < 0 || revenueSharePct > 100) {
    throw new Error('El porcentaje de ingresos debe estar entre 0 y 100');
  }

  const { data: authData, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      academia_role: 'instructor',
      full_name: fullName,
    },
  });

  if (authError) {
    const msg = authError.message.toLowerCase();
    if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
      throw new Error(
        'Ya existe una cuenta con ese correo. Usa otro correo o elimina la cuenta previa en Supabase.',
      );
    }
    throw new Error(authError.message);
  }

  const userId = authData.user?.id;
  if (!userId) throw new Error('No se pudo crear el usuario de acceso');

  const { data: existingStudent } = await db
    .from('course_student_profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingStudent) {
    await db.auth.admin.deleteUser(userId);
    throw new Error('Conflicto de perfil: la cuenta quedó asociada a un alumno.');
  }

  const { data: profile, error: profileError } = await db
    .from('course_instructor_profiles')
    .insert({
      id: userId,
      full_name: fullName,
      bio: input.bio?.trim() || null,
      status: 'approved',
      revenue_share_pct: revenueSharePct,
    })
    .select('id, full_name, status, revenue_share_pct, created_at')
    .single();

  if (profileError) {
    await db.auth.admin.deleteUser(userId);
    throw new Error(profileError.message);
  }

  return {
    ...profile,
    email,
    revenue_share_pct: Number(profile.revenue_share_pct),
  };
}
