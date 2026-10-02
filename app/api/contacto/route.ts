import { NextResponse } from 'next/server';
import { databaseUnavailableJson, parseJsonBody } from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';
import { sendMail } from '@/lib/email';
import { escapeHtml, escapeHtmlBr } from '@/lib/public/forms';
import { HONEYPOT_FIELD_NAME } from '@/lib/security/honeypot';
import { enforcePublicFormGuard } from '@/lib/security/public-form-guard';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const body = await parseJsonBody<{
    nombre?: string;
    email?: string;
    telefono?: string;
    asunto?: string;
    mensaje?: string;
    cf_turnstile_response?: string;
    'cf-turnstile-response'?: string;
    company_url?: string;
  }>(request);

  const { nombre, email, telefono, asunto, mensaje } = body;
  const honeypot = body[HONEYPOT_FIELD_NAME] ?? body.company_url;
  const turnstileToken =
    (typeof body.cf_turnstile_response === 'string'
      ? body.cf_turnstile_response
      : null) ||
    (typeof body['cf-turnstile-response'] === 'string'
      ? body['cf-turnstile-response']
      : null);

  if (!nombre || !email || !asunto || !mensaje) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos' },
      { status: 400 },
    );
  }

  const guard = await enforcePublicFormGuard({
    form: 'contacto',
    email,
    honeypot,
    turnstileToken,
    request,
  });
  if (!guard.ok) {
    if ('honeypot' in guard) {
      return NextResponse.json({
        success: true,
        message: 'Mensaje recibido',
      });
    }
    return guard.response;
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
