'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Check, MessageCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import {
  buildReferralRegistroUrl,
  whatsAppShareUrl,
} from '@/lib/referral/client';

type ReferidoApi = {
  disponible: boolean;
  codigo_referido?: string;
  total_referidos?: number;
  referidos_con_cita?: number;
  descuento_referidor_pendiente?: boolean;
  mensaje?: string;
};

export function ReferralSharePanel({ userName }: { userName?: string }) {
  const locale = useLocale();
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<ReferidoApi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    fetch('/api/mi-referido', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((json: ReferidoApi) => setData(json))
      .catch(() => setData({ disponible: false }))
      .finally(() => setLoading(false));
  }, []);

  const codigo = data?.codigo_referido || '';

  const shareUrl = useMemo(() => {
    if (!origin || !codigo) return '';
    return buildReferralRegistroUrl(codigo, origin, locale);
  }, [origin, codigo, locale]);

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copia este enlace:', shareUrl);
    }
  }

  function shareWhatsApp() {
    if (!shareUrl) return;
    const firstName = (userName || '').trim().split(/\s+/)[0];
    const saludo = firstName ? `Hola, soy ${firstName}. ` : 'Hola. ';
    const message =
      `${saludo}Te invito a registrarte en Psicólogos en Red, una plataforma de atención psicológica en línea. ` +
      `Crea tu cuenta con este enlace y podrás agendar con nuestros especialistas:\n\n${shareUrl}`;
    window.open(whatsAppShareUrl(message), '_blank', 'noopener,noreferrer');
  }

  if (loading) {
    return <p className="referidos-share-loading">Cargando tu enlace personal…</p>;
  }

  if (!data?.disponible || !codigo) {
    return (
      <p className="referidos-share-unavailable">
        {data?.mensaje ||
          'El programa de referidos estará disponible en breve.'}
      </p>
    );
  }

  return (
    <div className="referidos-share">
      {data.descuento_referidor_pendiente ? (
        <p className="referidos-pending-banner" role="status">
          Tienes un <strong>50&nbsp;% de descuento</strong> pendiente en tu
          próxima sesión.
        </p>
      ) : null}

      <p className="referidos-share-stats">
        Personas referidas: <strong>{data.total_referidos ?? 0}</strong>
        {(data.referidos_con_cita ?? 0) > 0 ? (
          <>
            {' '}
            · Con cita agendada:{' '}
            <strong>{data.referidos_con_cita}</strong>
          </>
        ) : null}
      </p>

      <p className="referidos-share-label">Tu enlace para compartir</p>
      <div className="referidos-share-row">
        <input
          type="text"
          className="referidos-share-input"
          readOnly
          value={shareUrl || '…'}
          aria-label="Enlace personal de referido"
          onFocus={(e) => e.currentTarget.select()}
        />
        <button
          type="button"
          className="referidos-share-btn referidos-share-btn-copy"
          onClick={copyLink}
          disabled={!shareUrl}
          aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
        >
          {copied ? (
            <>
              <Check aria-hidden="true" />
              <span>Copiado</span>
            </>
          ) : (
            <>
              <Copy aria-hidden="true" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <button
        type="button"
        className="referidos-share-btn referidos-share-btn-wa"
        onClick={shareWhatsApp}
        disabled={!shareUrl}
      >
        <MessageCircle aria-hidden="true" />
        Compartir por WhatsApp
      </button>
    </div>
  );
}
