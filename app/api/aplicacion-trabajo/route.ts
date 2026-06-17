import { NextResponse } from 'next/server';
import { databaseUnavailableJson, parseJsonBody } from '@/lib/auth/api';
import { isDatabaseConfigured } from '@/lib/db';
import { sendMail } from '@/lib/email';
import { escapeHtml, escapeHtmlBr } from '@/lib/public/forms';

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return databaseUnavailableJson();

  const body = await parseJsonBody<{
    nombre?: string;
    telefono?: string;
    email?: string;
    pais?: string;
    razones?: string;
    experiencia?: string;
  }>(request);

  const { nombre, telefono, email, pais, razones, experiencia } = body;

  if (!nombre || !telefono || !email || !pais || !razones || !experiencia) {
    return NextResponse.json(
      { error: 'Faltan campos requeridos' },
      { status: 400 },
    );
  }

  try {
    const html = `
      <h2>Nueva solicitud de trabajo</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(nombre)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(telefono)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>País:</strong> ${escapeHtml(pais)}</p>
      <p><strong>¿Por qué quiere trabajar con nosotros?</strong></p>
      <p>${escapeHtmlBr(razones)}</p>
      <p><strong>Experiencia:</strong></p>
      <p>${escapeHtmlBr(experiencia)}</p>
      <p style="color:#888;font-size:12px;">Enviado el ${new Date().toLocaleString('es-MX')}</p>
    `;

    await sendMail({
      to: 'contacto@psicologosenred.com',
      subject: `[Trabaja con nosotros] ${escapeHtml(nombre)} - ${escapeHtml(pais)}`,
      html,
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud recibida',
    });
  } catch (error) {
    console.error('POST /api/aplicacion-trabajo:', error);
    return NextResponse.json(
      { error: 'Error al enviar solicitud' },
      { status: 500 },
    );
  }
}
