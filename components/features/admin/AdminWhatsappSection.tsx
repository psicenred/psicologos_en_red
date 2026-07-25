'use client';

import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type WhatsappStatus = {
  provider: string;
  baileysConfigured: boolean;
  twilioConfigured: boolean;
  workerUrl: string | null;
  pairPath: string | null;
  worker: { connected: boolean; provider: string; queueDepth?: number; minIntervalMs?: number } | null;
};

async function fetchStatus(): Promise<WhatsappStatus> {
  const res = await fetch('/api/admin/whatsapp', { credentials: 'include' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<WhatsappStatus>;
}

export function AdminWhatsappSection() {
  const queryClient = useQueryClient();
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState(
    'Prueba de WhatsApp desde Panel Admin · Psicólogos en Red',
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, isFetching, error: statusError, refetch } = useQuery({
    queryKey: ['admin-whatsapp-status'],
    queryFn: fetchStatus,
    refetchInterval: 15_000,
  });

  const connected = Boolean(data?.worker?.connected);

  const onSend = useCallback(async () => {
    setSending(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/whatsapp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefono, mensaje }),
      });
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        via?: string;
        error?: string;
        telefono?: string;
      } | null;
      if (!res.ok) {
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setResult(
        `Enviado por ${body?.via ?? 'whatsapp'} a ${body?.telefono ?? telefono}`,
      );
      await queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-status'] });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }, [telefono, mensaje, queryClient]);

  return (
    <section id="whatsapp" className="admin-section active">
      <div className="stats-grid">
        <div className="stat-card">
          <div className={`stat-icon ${connected ? 'verde' : 'rosa'}`}>
            {connected ? '✅' : '📵'}
          </div>
          <div className="stat-info">
            <h3>{isLoading ? '…' : connected ? 'Conectado' : 'Desconectado'}</h3>
            <p>Worker Baileys</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon azul">⚙️</div>
          <div className="stat-info">
            <h3>{data?.provider ?? '—'}</h3>
            <p>Provider (Vercel)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon azul">🔗</div>
          <div className="stat-info">
            <h3>{data?.baileysConfigured ? 'Sí' : 'No'}</h3>
            <p>Worker configurado</p>
          </div>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Estado del worker</h2>
          <button
            type="button"
            className="btn-logout"
            style={{ background: '#667eea' }}
            disabled={isFetching}
            onClick={() => refetch()}
          >
            {isFetching ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {statusError ? (
          <p style={{ color: '#c0392b' }}>{(statusError as Error).message}</p>
        ) : (
          <ul className="whatsapp-status-list">
            <li>
              <strong>URL worker:</strong> {data?.workerUrl || '— no configurada'}
            </li>
            <li>
              <strong>Baileys:</strong>{' '}
              {data?.baileysConfigured ? 'variables OK' : 'faltan WHATSAPP_WORKER_*'}
            </li>
            <li>
              <strong>Twilio:</strong>{' '}
              {data?.twilioConfigured ? 'configurado (fallback)' : 'no configurado'}
            </li>
            <li>
              <strong>Sesión WhatsApp:</strong>{' '}
              {connected ? 'vinculada' : 'sin vincular o caída'}
            </li>
            <li>
              <strong>Cola / intervalo:</strong>{' '}
              {typeof data?.worker?.queueDepth === 'number'
                ? `${data.worker.queueDepth} en cola`
                : '—'}
              {typeof data?.worker?.minIntervalMs === 'number'
                ? ` · mínimo ${Math.round(data.worker.minIntervalMs / 1000)}s entre mensajes`
                : ''}
            </li>
            {data?.pairPath ? (
              <li>
                <strong>Re-vincular:</strong>{' '}
                <span style={{ wordBreak: 'break-all' }}>{data.pairPath}</span>
                <span style={{ color: '#888', marginLeft: 6 }}>
                  (usa el secret real de Railway)
                </span>
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Enviar mensaje de prueba</h2>
        </div>

        <div className="whatsapp-test-form">
          <div className="filtro-grupo" style={{ width: '100%', maxWidth: 420 }}>
            <label htmlFor="wa-telefono">Teléfono (con país)</label>
            <input
              id="wa-telefono"
              type="tel"
              placeholder="+525512345678"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <div className="filtro-grupo" style={{ width: '100%', maxWidth: 560 }}>
            <label htmlFor="wa-mensaje">Mensaje</label>
            <textarea
              id="wa-mensaje"
              rows={4}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #dde3ef' }}
            />
          </div>
          <button
            type="button"
            className="whatsapp-send-btn"
            disabled={sending || !telefono.trim()}
            onClick={onSend}
          >
            {sending ? 'Enviando…' : 'Enviar WhatsApp'}
          </button>

          {result ? <p className="whatsapp-ok">{result}</p> : null}
          {error ? <p className="whatsapp-err">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
