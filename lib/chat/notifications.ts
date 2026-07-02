import { getBaseUrl } from '@/lib/config';
import { query } from '@/lib/db';
import { sendMail } from '@/lib/email';
import { enviarWhatsapp } from '@/lib/whatsapp';

const CHAT_NOTIF_EMAIL_INTERVAL_MINUTES = 60;

export async function enviarCorreoNotificacionChatSiAplica(
  destinatarioId: number,
  remitenteId: number,
): Promise<void> {
  if (!destinatarioId || !remitenteId) return;
  try {
    const r = await query(
      `SELECT enviado_at FROM chat_notificacion_email WHERE destinatario_id = $1 AND remitente_id = $2`,
      [destinatarioId, remitenteId],
    );
    const lastSent = (r.rows[0] as { enviado_at?: Date } | undefined)?.enviado_at;
    if (lastSent) {
      const mins =
        (Date.now() - new Date(lastSent).getTime()) / (60 * 1000);
      if (mins < CHAT_NOTIF_EMAIL_INTERVAL_MINUTES) return;
    }

    const [destRow, remRow] = await Promise.all([
      query('SELECT nombre, email, telefono FROM usuarios WHERE id = $1', [
        destinatarioId,
      ]),
      query(
        `SELECT u.nombre AS usuario_nombre, p.nombre AS psicologo_nombre
         FROM usuarios u LEFT JOIN psicologos p ON p.usuario_id = u.id WHERE u.id = $1`,
        [remitenteId],
      ),
    ]);
    const dest = destRow.rows[0] as
      | { nombre?: string; email?: string; telefono?: string }
      | undefined;
    const rem = remRow.rows[0] as
      | { usuario_nombre?: string; psicologo_nombre?: string }
      | undefined;
    if (!dest?.email && !dest?.telefono) return;
    const nombreRemitente = (
      rem?.psicologo_nombre ||
      rem?.usuario_nombre ||
      'Alguien'
    ).trim();
    const enlaceLogin = getBaseUrl() + '/login';

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #c9a0dc;">Psicólogos en Red</h1></div>
            <h2 style="color: #333;">Te están escribiendo</h2>
            <p style="color: #666; font-size: 16px;">Hola ${(dest.nombre || '').split(' ')[0] || 'hola'}, <strong>${nombreRemitente}</strong> está tratando de comunicarse contigo.</p>
            <p style="color: #666; font-size: 16px;">Inicia sesión para ver el mensaje que te mandó.</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${enlaceLogin}" style="background: linear-gradient(135deg, #c9a0dc 0%, #a0c4e8 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: bold;">Iniciar sesión</a>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">© ${new Date().getFullYear()} Psicólogos en Red.</p>
        </div>`;

    if (dest.email) {
      await sendMail({
        to: dest.email,
        bcc: 'contacto@psicologosenred.com',
        subject:
          '💬 ' +
          nombreRemitente +
          ' está tratando de comunicarse contigo - Psicólogos en Red',
        html,
      });
    }

    await enviarWhatsapp(
      dest.telefono,
      `Psicólogos en Red – ${nombreRemitente} te escribió en el chat. Inicia sesión para ver el mensaje: ${enlaceLogin}`,
    );

    await query(
      `INSERT INTO chat_notificacion_email (destinatario_id, remitente_id, enviado_at) VALUES ($1, $2, NOW())
       ON CONFLICT (destinatario_id, remitente_id) DO UPDATE SET enviado_at = NOW()`,
      [destinatarioId, remitenteId],
    );
  } catch (e) {
    console.error(
      'Error enviando correo notificación chat:',
      (e as Error).message,
    );
  }
}
