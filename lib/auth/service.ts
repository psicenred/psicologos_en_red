import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { getBaseUrl } from '@/lib/config';
import { isDatabaseConfigured, query } from '@/lib/db';
import { sendMail } from '@/lib/email';
import {
  authMessageBox,
  normalizeEmail,
  normalizeRol,
} from '@/lib/auth/api';
import {
  attachReferidoOnRegister,
  ensureCodigoReferido,
} from '@/lib/referral/service';

export function ensureDb(): boolean {
  return isDatabaseConfigured();
}

export type RegisterUsuarioResult =
  | { redirect: '/registro-exitoso' }
  | {
      error: {
        code:
          | 'EMAIL_EXISTS'
          | 'PHONE_TOO_LONG'
          | 'FIELD_TOO_LONG'
          | 'SERVER_ERROR';
        title: string;
        body: string;
        status: number;
      };
    };

function mapRegisterDbError(err: unknown): RegisterUsuarioResult['error'] | null {
  const msg = (err as { message?: string }).message || '';
  if (
    msg.includes('usuarios_email_key') ||
    (msg.includes('duplicate key') && msg.includes('email'))
  ) {
    return {
      code: 'EMAIL_EXISTS',
      title: 'Correo ya registrado',
      body: 'Este correo ya está registrado.',
      status: 409,
    };
  }
  if (msg.includes('value too long') && msg.includes('telefono')) {
    return {
      code: 'PHONE_TOO_LONG',
      title: 'Teléfono inválido',
      body: 'El teléfono es demasiado largo. Usa solo el número local sin repetir el código de país.',
      status: 400,
    };
  }
  if (msg.includes('value too long')) {
    return {
      code: 'FIELD_TOO_LONG',
      title: 'Datos demasiado largos',
      body: 'Revisa nombre, correo o teléfono e intenta de nuevo.',
      status: 400,
    };
  }
  return null;
}

function normalizeTelefonoRegistro(telefono: string | undefined): string | null {
  const trimmed = telefono?.trim();
  return trimmed || null;
}

export async function registerUsuario(
  body: Record<string, string>,
): Promise<RegisterUsuarioResult> {
  const { nombre, password, acepto_terminos, acepto_publicidad, telefono } = body;
  const email = normalizeEmail(body.email);
  const rolRegistro = 'paciente';
  const refCode = body.ref_code || body.ref || '';

  const existente = await query('SELECT id FROM usuarios WHERE LOWER(email) = $1', [email]);
  if (existente.rows.length > 0) {
    return {
      error: {
        code: 'EMAIL_EXISTS',
        title: 'Correo ya registrado',
        body: 'Este correo ya está registrado.',
        status: 409,
      },
    };
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const aceptoTerminos = acepto_terminos === 'on' || acepto_terminos === 'true';
  const aceptoPublicidad =
    acepto_publicidad === 'on' || acepto_publicidad === 'true';
  const telefonoNorm = normalizeTelefonoRegistro(telefono);
  if (telefonoNorm && telefonoNorm.length > 20) {
    return {
      error: {
        code: 'PHONE_TOO_LONG',
        title: 'Teléfono inválido',
        body: 'El teléfono es demasiado largo. Usa solo el número local sin repetir el código de país.',
        status: 400,
      },
    };
  }

  const tokenVerificacion = crypto.randomBytes(32).toString('hex');
  const tokenExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);

  let inserted;
  try {
    inserted = await query<{ id: number }>(
      `INSERT INTO usuarios (nombre, email, telefono, password, rol, acepto_terminos, acepto_publicidad, email_verificado, token_verificacion, token_verificacion_expira)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        nombre.trim().slice(0, 100),
        email.slice(0, 100),
        telefonoNorm,
        hashedPassword,
        rolRegistro,
        aceptoTerminos,
        aceptoPublicidad,
        false,
        tokenVerificacion,
        tokenExpira,
      ],
    );
  } catch (err) {
    const mapped = mapRegisterDbError(err);
    if (mapped) {
      return { error: mapped };
    }
    throw err;
  }

  const newUserId = inserted.rows[0]?.id;
  if (newUserId) {
    try {
      await ensureCodigoReferido(newUserId);
      await attachReferidoOnRegister(newUserId, refCode);
    } catch (err) {
      console.error('[referidos] post-registro:', err);
    }
  }

  const enlaceVerificacion = `${getBaseUrl()}/verificar-email?token=${tokenVerificacion}`;

  void sendVerificationEmail(email, nombre, enlaceVerificacion).catch((err) => {
    console.error('[verificacion] Error enviando correo:', err);
  });

  return { redirect: '/registro-exitoso' as const };
}

async function sendVerificationEmail(
  to: string,
  nombre: string,
  enlaceVerificacion: string,
) {
  await sendMail({
    to,
    subject: '✅ Verifica tu cuenta - Psicólogos en Red',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #c9a0dc;">Psicólogos en Red</h1>
        </div>
        <h2 style="color: #333;">¡Hola ${nombre}!</h2>
        <p style="color: #666; font-size: 16px;">Gracias por registrarte. Verifica tu correo haciendo clic en el botón:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${enlaceVerificacion}" style="background: linear-gradient(135deg, #c9a0dc 0%, #a0c4e8 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: bold;">Verificar mi cuenta</a>
        </div>
        <p style="color: #999; font-size: 14px;">Este enlace expira en 24 horas.</p>
      </div>
    `,
  });
}

import type { SessionUsuario } from '@/lib/session';

export type LoginErrorCode = 'user_not_found' | 'wrong_password' | 'unverified';

export type LoginResult =
  | { ok: true; usuario: SessionUsuario; rol: string }
  | { ok: false; code: LoginErrorCode; email?: string };

export async function loginWithCredentials(
  email: string,
  password: string,
): Promise<LoginResult> {
  const emailNorm = normalizeEmail(email);
  const result = await query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [emailNorm]);
  if (result.rows.length === 0) {
    return { ok: false, code: 'user_not_found' };
  }

  const usuario = result.rows[0] as {
    id: number;
    nombre: string;
    email: string;
    password: string;
    rol: string;
    email_verificado: boolean;
  };

  const rolNormalizado = normalizeRol(usuario.rol);

  if (rolNormalizado !== 'admin' && !usuario.email_verificado) {
    return { ok: false, code: 'unverified', email: emailNorm };
  }

  const match = await bcrypt.compare(password, usuario.password);
  if (!match) {
    return { ok: false, code: 'wrong_password' };
  }

  if (rolNormalizado === 'paciente' || rolNormalizado === 'psicologo') {
    try {
      await query(
        'UPDATE usuarios SET veces_inicio_sesion = COALESCE(veces_inicio_sesion, 0) + 1 WHERE id = $1',
        [usuario.id],
      );
    } catch (error) {
      console.warn('[login] No se pudo actualizar veces_inicio_sesion:', error);
    }
  }

  return {
    ok: true,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: rolNormalizado,
    },
    rol: rolNormalizado,
  };
}

export async function verifyEmailToken(token: string) {
  if (!token) {
    return authMessageBox({
      variant: 'error',
      title: '❌ Enlace inválido',
      body: 'El enlace de verificación no es válido.',
      actionHtml: '<a href="/login">Ir al login</a>',
    });
  }

  const result = await query(
    'SELECT id, nombre, token_verificacion_expira FROM usuarios WHERE token_verificacion = $1',
    [token],
  );

  if (result.rows.length === 0) {
    return authMessageBox({
      variant: 'error',
      title: '❌ Enlace inválido',
      body: 'El enlace de verificación no existe o ya fue utilizado.',
      actionHtml: '<a href="/login">Ir al login</a>',
    });
  }

  const usuario = result.rows[0] as {
    id: number;
    nombre: string;
    token_verificacion_expira: Date;
  };

  if (new Date() > new Date(usuario.token_verificacion_expira)) {
    return authMessageBox({
      variant: 'error',
      title: '⏰ Enlace expirado',
      body: 'El enlace de verificación ha expirado. Intenta iniciar sesión para solicitar uno nuevo.',
      actionHtml: '<a href="/login">Ir al login</a>',
    });
  }

  await query(
    'UPDATE usuarios SET email_verificado = true, token_verificacion = NULL, token_verificacion_expira = NULL WHERE id = $1',
    [usuario.id],
  );

  return authMessageBox({
    variant: 'success',
    title: '✅ ¡Correo verificado!',
    body: `Hola ${usuario.nombre}, tu cuenta ha sido verificada exitosamente. Ya puedes iniciar sesión.`,
    actionHtml: `<a href="/login" style="display: inline-block; margin-top: 15px; padding: 12px 30px; background: linear-gradient(135deg, #c9a0dc 0%, #a0c4e8 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Iniciar sesión</a>`,
  });
}

export async function resendVerificationEmail(email: string) {
  const emailNorm = normalizeEmail(email);
  if (!emailNorm) return { redirect: '/login' };

  const result = await query(
    'SELECT id, nombre, email_verificado FROM usuarios WHERE LOWER(email) = $1',
    [emailNorm],
  );

  if (result.rows.length === 0) {
    return authMessageBox({
      variant: 'error',
      title: '❌ Usuario no encontrado',
      body: '',
      actionHtml: '<a href="/login">Ir al login</a>',
    });
  }

  const usuario = result.rows[0] as {
    id: number;
    nombre: string;
    email_verificado: boolean;
  };

  if (usuario.email_verificado) {
    return authMessageBox({
      variant: 'success',
      title: '✅ Tu correo ya está verificado',
      body: '',
      actionHtml: `<a href="/login" style="display: inline-block; margin-top: 15px; padding: 12px 30px; background: linear-gradient(135deg, #c9a0dc 0%, #a0c4e8 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">Iniciar sesión</a>`,
    });
  }

  const tokenVerificacion = crypto.randomBytes(32).toString('hex');
  const tokenExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await query(
    'UPDATE usuarios SET token_verificacion = $1, token_verificacion_expira = $2 WHERE id = $3',
    [tokenVerificacion, tokenExpira, usuario.id],
  );

  const enlaceVerificacion = `${getBaseUrl()}/verificar-email?token=${tokenVerificacion}`;

  await sendMail({
    to: emailNorm,
    subject: '✅ Verifica tu cuenta - Psicólogos en Red',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">¡Hola ${usuario.nombre}!</h2>
        <p style="color: #666;">Has solicitado un nuevo enlace de verificación:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${enlaceVerificacion}" style="background: linear-gradient(135deg, #c9a0dc 0%, #a0c4e8 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold;">Verificar mi cuenta</a>
        </div>
        <p style="color: #999; font-size: 14px;">Este enlace expira en 24 horas.</p>
      </div>
    `,
  });

  return authMessageBox({
    variant: 'success',
    title: '📧 ¡Correo enviado!',
    body: `Hemos enviado un nuevo enlace de verificación a <strong>${emailNorm}</strong>. Revisa tu bandeja de entrada (y spam).`,
    actionHtml: `<a href="/login" style="display: inline-block; margin-top: 15px; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 25px;">Volver al login</a>`,
  });
}

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: true } | { ok: false; code: 'not_found' | 'mail_failed' }> {
  const emailNorm = normalizeEmail(email);
  const result = await query('SELECT * FROM usuarios WHERE LOWER(email) = $1', [emailNorm]);
  if (result.rows.length === 0) {
    return { ok: false, code: 'not_found' };
  }

  const usuario = result.rows[0] as { id: number; nombre: string };
  const tokenReset = crypto.randomBytes(32).toString('hex');
  const tokenExpira = new Date(Date.now() + 60 * 60 * 1000);

  await query(
    'UPDATE usuarios SET token_reset_password = $1, token_reset_expira = $2 WHERE id = $3',
    [tokenReset, tokenExpira, usuario.id],
  );

  const resetLink = `${getBaseUrl()}/reestablecer-password?token=${tokenReset}`;

  try {
    await sendMail({
      to: emailNorm,
      subject: 'Reestablece tu contraseña - Psicólogos en Red 🔐',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Hola, ${usuario.nombre}</h2>
        <p style="color: #666;">Recibimos una solicitud para reestablecer tu contraseña:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="background: linear-gradient(135deg, #c9a0dc 0%, #a0c4e8 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-weight: bold;">Reestablecer contraseña</a>
        </div>
        <p style="color: #999; font-size: 14px;">Este enlace expira en 1 hora.</p>
      </div>
    `,
    });
  } catch (error) {
    console.error('[requestPasswordReset] sendMail:', error);
    return { ok: false, code: 'mail_failed' };
  }

  return { ok: true };
}

export async function isResetTokenValid(token: string): Promise<boolean> {
  if (!token) return false;
  const result = await query(
    'SELECT id FROM usuarios WHERE token_reset_password = $1 AND token_reset_expira > NOW()',
    [token],
  );
  return result.rows.length > 0;
}

export async function updatePasswordWithToken(token: string, password: string) {
  const result = await query(
    'SELECT id FROM usuarios WHERE token_reset_password = $1 AND token_reset_expira > NOW()',
    [token],
  );
  if (result.rows.length === 0) {
    return { error: 'Enlace inválido o expirado. Solicita uno nuevo desde el login.' };
  }
  const usuarioId = (result.rows[0] as { id: number }).id;
  const hashedPassword = await bcrypt.hash(password, 10);
  await query(
    'UPDATE usuarios SET password = $1, token_reset_password = NULL, token_reset_expira = NULL WHERE id = $2',
    [hashedPassword, usuarioId],
  );
  return { success: true as const };
}

export type UpdateProfileInput = {
  nombre: string;
  telefono?: string | null;
  contacto_emergencia?: string | null;
  password?: string;
};

export async function updateUsuarioProfile(
  usuarioId: number,
  currentNombre: string,
  input: UpdateProfileInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = input.nombre?.trim() || currentNombre;
  const telefono = input.telefono?.trim() || null;
  const contactoEmerg =
    input.contacto_emergencia != null && String(input.contacto_emergencia).trim() !== ''
      ? String(input.contacto_emergencia).trim().slice(0, 255)
      : null;
  const password = input.password;

  try {
    if (password && password.trim() !== '' && password !== '********') {
      const hashedPassword = await bcrypt.hash(password, 10);
      await query(
        'UPDATE usuarios SET nombre = $1, telefono = $2, contacto_emergencia = $3, password = $4 WHERE id = $5',
        [nombre, telefono, contactoEmerg, hashedPassword, usuarioId],
      );
    } else {
      await query(
        'UPDATE usuarios SET nombre = $1, telefono = $2, contacto_emergencia = $3 WHERE id = $4',
        [nombre, telefono, contactoEmerg, usuarioId],
      );
    }
    return { ok: true };
  } catch (error) {
    console.error('updateUsuarioProfile:', error);
    return { ok: false, error: 'Error al actualizar el perfil' };
  }
}
