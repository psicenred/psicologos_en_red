import nodemailer from 'nodemailer';

export interface MailAttachment {
  filename: string;
  content: string;
  contentType?: string;
}

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  bcc?: string | string[];
  attachments?: MailAttachment[];
}

function getEmailTransporter() {
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.zoho.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.EMAIL_USER || 'contacto@psicologosenred.com',
      pass: process.env.EMAIL_PASS || '',
    },
  });
}

/** Resend si hay API key; si no, Nodemailer SMTP (igual que legacy). */
export async function sendMail(opts: SendMailOptions): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const resendFrom = process.env.RESEND_FROM || 'onboarding@resend.dev';
    const from = `Psicólogos en Red <${resendFrom}>`;
    const to = Array.isArray(opts.to) ? opts.to : [opts.to];

    const body: Record<string, unknown> = {
      from,
      to,
      subject: opts.subject,
      html: opts.html,
    };
    if (opts.bcc) {
      body.bcc = Array.isArray(opts.bcc) ? opts.bcc : [opts.bcc];
    }
    if (opts.attachments?.length) {
      body.attachments = opts.attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, 'utf8').toString('base64'),
      }));
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      id?: string;
      error?: { message?: string };
      message?: string;
    };
    if (!res.ok || data.error) {
      console.error('[email] Resend error:', data);
      throw new Error(data.message || data.error?.message || 'Resend error');
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email] Resend ok:', data.id, '→', to);
    }
    return;
  }

  const transporter = getEmailTransporter();
  await transporter.sendMail({
    from: `"Psicólogos en Red" <${process.env.EMAIL_USER || 'contacto@psicologosenred.com'}>`,
    to: opts.to,
    bcc: opts.bcc,
    subject: opts.subject,
    html: opts.html,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });
}
