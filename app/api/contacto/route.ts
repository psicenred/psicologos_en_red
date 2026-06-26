import { NextResponse } from 'next/server';
import { databaseUnavailableJson, parseJsonBody } from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';
import { sendMail } from '@/lib/email';
import { escapeHtml, escapeHtmlBr } from '@/lib/public/forms';
import { enforceRateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, {
    bucket: 'public:contacto',
    limit: 5,
    windowSec: 3600,
  });
  if (limited) return limited;

  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const body = await parseJsonBody<{
    nombre?: string;
    email?: string;
    telefono?: string;
    asunto?: string;
    mensaje?: string;
  }>(request);

  const { nombre, email, telefono, asunto, mensaje } = body;

  if (!nombre || !email || !asunto || !mensaje) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos' },
      { status: 400 },
    );
  }

  try {
    const html = `
      <h2>Nuevo mensaje de contacto</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono || 'No proporcionado')}</p>
      <p><strong>Asunto:</strong> ${escapeHtml(asunto)}</p>
      <p><strong>Mensaje:</strong></p>
      <p>${escapeHtmlBr(mensaje)}</p>
      <p style="color:#888;font-size:12px;">Enviado el ${new Date().toLocaleString('es-MX')}</p>
    `;

    await sendMail({
      to: 'contacto@psicologosenred.com',
      subject: `[Contacto] ${escapeHtml(asunto)} - ${escapeHtml(nombre)}`,
      html,
    });

    return NextResponse.json({
      success: true,
      message: 'Mensaje recibido',
    });
  } catch (error) {
    console.error('POST /api/contacto:', error);
    return NextResponse.json(
      { error: 'Error al enviar mensaje' },
      { status: 500 },
    );
  }
}
