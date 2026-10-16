'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  isIosDevice,
  isStandaloneDisplay,
  supportsWebPush,
  urlBase64ToUint8Array,
  registerServiceWorker,
} from '@/lib/push/client';

type Status =
  | 'loading'
  | 'unsupported'
  | 'not-configured'
  | 'ios-install'
  | 'denied'
  | 'off'
  | 'on';

export function PushNotificationsCard() {
  const [status, setStatus] = useState<Status>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    if (!supportsWebPush()) {
      setStatus('unsupported');
      return;
    }
    if (isIosDevice() && !isStandaloneDisplay()) {
      setStatus('ios-install');
      return;
    }
    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    const keyRes = await fetch('/api/push/vapid-public-key');
    if (!keyRes.ok) {
      setStatus('not-configured');
      return;
    }

    const reg = await registerServiceWorker();
    if (!reg) {
      setStatus('unsupported');
      return;
    }
    await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub ? 'on' : 'off');
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const keyRes = await fetch('/api/push/vapid-public-key');
      const keyData = (await keyRes.json()) as { publicKey?: string };
      if (!keyRes.ok || !keyData.publicKey) {
        setError('Las notificaciones push no están configuradas en el servidor.');
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off');
        setError('No se concedió el permiso de notificaciones.');
        return;
      }

      const reg = await registerServiceWorker();
      if (!reg) {
        setError('No se pudo registrar el Service Worker.');
        return;
      }
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            keyData.publicKey,
          ) as BufferSource,
        });
      }

      const json = sub.toJSON();
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });
      if (!res.ok) {
        setError('No se pudo guardar la suscripción. Intenta de nuevo.');
        return;
      }
      setStatus('on');
    } catch (e) {
      console.error('[push] enable:', e);
      setError('No se pudieron activar las notificaciones en este dispositivo.');
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('off');
    } catch (e) {
      console.error('[push] disable:', e);
      setError('No se pudieron desactivar las notificaciones.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="config-card" style={{ marginTop: 24 }}>
      <h3 style={{ marginTop: 0 }}>🔔 Notificaciones push</h3>
      <p style={{ color: '#666', fontSize: '0.95rem', lineHeight: 1.5 }}>
        Recibe avisos en este dispositivo cuando tengas un mensaje nuevo o un
        recordatorio de sesión (con la app instalada en el celular).
      </p>

      {status === 'loading' ? (
        <p style={{ color: '#888' }}>Comprobando soporte…</p>
      ) : null}

      {status === 'unsupported' ? (
        <p style={{ color: '#888' }}>
          Este navegador no soporta notificaciones push. Prueba Chrome en Android
          o Safari en iPhone (app instalada).
        </p>
      ) : null}

      {status === 'not-configured' ? (
        <p style={{ color: '#888' }}>
          Las notificaciones push aún no están activas en el servidor. Vuelve
          pronto.
        </p>
      ) : null}

      {status === 'ios-install' ? (
        <p style={{ color: '#666', lineHeight: 1.5 }}>
          En iPhone debes <strong>añadir la app a la pantalla de inicio</strong>{' '}
          (Compartir → “Añadir a pantalla de inicio”) y abrirla desde el icono
          para poder activar las notificaciones.
        </p>
      ) : null}

      {status === 'denied' ? (
        <p style={{ color: '#c0392b' }}>
          El permiso está bloqueado. Actívalo en Ajustes del sistema / del
          navegador para este sitio.
        </p>
      ) : null}

      {status === 'off' || status === 'on' ? (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {status === 'off' ? (
            <button
              type="button"
              className="btn-editar-v2"
              disabled={busy}
              onClick={() => void enable()}
            >
              {busy ? 'Activando…' : 'Activar notificaciones'}
            </button>
          ) : (
            <>
              <span style={{ color: '#2e7d32', fontWeight: 600 }}>Activadas en este dispositivo</span>
              <button
                type="button"
                className="btn-editar-v2"
                disabled={busy}
                onClick={() => void disable()}
                style={{ opacity: 0.85 }}
              >
                {busy ? 'Desactivando…' : 'Desactivar'}
              </button>
            </>
          )}
        </div>
      ) : null}

      {error ? (
        <p style={{ color: '#c0392b', marginTop: 12, fontSize: '0.9rem' }}>{error}</p>
      ) : null}
    </div>
  );
}
