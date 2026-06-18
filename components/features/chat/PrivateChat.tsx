'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  enviarAdjuntoChatAction,
  enviarMensajeAction,
  loadMensajesAction,
  mensajesNoLeidosPorContactoAction,
} from '@/lib/chat/actions';
import { fetchApiList, networkErrorMessage } from '@/lib/fetch-api';

type Contacto = { id: number; nombre: string };

type Mensaje = {
  id: number;
  contenido: string;
  remitente_id: number;
  ruta_adjunto?: string | null;
  nombre_adjunto?: string | null;
  fecha_envio?: string;
};

function mapContacto(raw: Contacto & { usuario_id?: number }): Contacto {
  const id = Number(raw.usuario_id ?? raw.id);
  return { id, nombre: raw.nombre };
}

async function fetchUnreadByContact(): Promise<Record<string, number>> {
  const result = await mensajesNoLeidosPorContactoAction();
  if (!result.ok) return {};
  return result.data;
}

export function PrivateChat({
  contactos: contactosProp,
  contactosEndpoint,
  contactosLoading = false,
  contactosError = null,
  variant = 'default',
}: {
  contactos?: Contacto[];
  contactosEndpoint?: string;
  contactosLoading?: boolean;
  contactosError?: string | null;
  variant?: 'default' | 'legacy' | 'legacy-doctor';
}) {
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState<number | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [miId, setMiId] = useState<number | null>(null);
  const [nuevoMsg, setNuevoMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const shouldFetchContactos = contactosProp == null;

  const {
    data: fetchedContactos = [],
    isLoading: loadingContactos,
    isError: contactosFetchError,
    error: contactosFetchErr,
  } = useQuery({
    queryKey: ['chat-contactos', contactosEndpoint],
    queryFn: async () => {
      const rows = await fetchApiList<Contacto & { usuario_id?: number }>(
        contactosEndpoint || '/api/mis-psicologos-contacto',
      );
      return rows.map(mapContacto).filter((c) => Number.isFinite(c.id) && c.id > 0);
    },
    enabled: shouldFetchContactos,
  });

  const contactos = (contactosProp ?? fetchedContactos).filter(
    (c) => Number.isFinite(c.id) && c.id > 0,
  );

  const contactosStatusError =
    contactosError ||
    (contactosFetchError ? networkErrorMessage(String(contactosFetchErr)) : null);
  const showContactosLoading = contactosLoading || (shouldFetchContactos && loadingContactos);

  const { data: unreadMap = {} } = useQuery({
    queryKey: ['mensajes-no-leidos-por-contacto'],
    queryFn: fetchUnreadByContact,
    refetchInterval: 30_000,
  });

  const loadMensajes = useCallback(
    async (destId: number) => {
      setMsgError(null);
      const result = await loadMensajesAction(destId);
      if (!result.ok) {
        setMsgError(result.error);
        setMensajes([]);
        return;
      }
      setMensajes(result.data.mensajes ?? []);
      setMiId(result.data.miId ?? null);
      queryClient.invalidateQueries({ queryKey: ['mensajes-no-leidos-por-contacto'] });
    },
    [queryClient],
  );

  useEffect(() => {
    if (chatId) loadMensajes(chatId);
  }, [chatId, loadMensajes]);

  async function enviarTexto() {
    if (!chatId || !nuevoMsg.trim()) return;
    setSending(true);
    setMsgError(null);
    try {
      const result = await enviarMensajeAction(chatId, nuevoMsg);
      if (!result.ok) {
        setMsgError(result.error);
        return;
      }
      setNuevoMsg('');
      await loadMensajes(chatId);
    } finally {
      setSending(false);
    }
  }

  async function enviarPdf(file: File) {
    if (!chatId) return;
    const form = new FormData();
    form.append('archivo', file);
    form.append('destinatarioId', String(chatId));
    setSending(true);
    setMsgError(null);
    try {
      const result = await enviarAdjuntoChatAction(form);
      if (!result.ok) {
        setMsgError(result.error);
        return;
      }
      await loadMensajes(chatId);
    } finally {
      setSending(false);
    }
  }

  function renderContactosEmpty() {
    if (showContactosLoading) {
      return <p style={{ fontSize: '0.8rem', color: '#888', padding: 10 }}>Cargando contactos…</p>;
    }
    if (contactosStatusError) {
      return (
        <p style={{ fontSize: '0.8rem', color: '#c0392b', padding: 10 }}>{contactosStatusError}</p>
      );
    }
    return (
      <p style={{ fontSize: '0.8rem', color: '#888', padding: 10 }}>Sin contactos aún.</p>
    );
  }

  function renderMensajes() {
    if (!chatId) {
      return <p className="chat-welcome-msg">Bienvenido a tu chat privado.</p>;
    }
    if (msgError) {
      return <p style={{ color: '#c0392b', padding: 12 }}>{msgError}</p>;
    }
    if (mensajes.length === 0) {
      return <p className="chat-welcome-msg">No hay mensajes todavía. Escribe el primero.</p>;
    }
    return mensajes.map((m) => {
      const esMio = miId != null && m.remitente_id === miId;
      return (
        <div key={m.id} className={`msg ${esMio ? 'enviado' : 'recibido'}`}>
          {m.ruta_adjunto ? (
            <a
              href={`/api/chat/archivo/${m.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="msg-adjunto-pdf"
            >
              📎 {m.nombre_adjunto || 'PDF adjunto'}
            </a>
          ) : (
            m.contenido
          )}
        </div>
      );
    });
  }

  if (variant === 'legacy-doctor') {
    const activo = contactos.find((c) => c.id === chatId);
    return (
      <div className="chat-main-container">
        <aside className="chat-sidebar">
          <h3>Mis Pacientes</h3>
          {contactos.length === 0 ? (
            renderContactosEmpty()
          ) : (
            contactos.map((c) => {
              const unread = unreadMap[String(c.id)] || 0;
              return (
                <div
                  key={c.id}
                  className={`contacto-item-doctor${chatId === c.id ? ' active' : ''}`}
                  onClick={() => setChatId(c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setChatId(c.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <strong style={{ display: 'block', color: chatId === c.id ? 'white' : '#1e40af' }}>
                      {c.nombre}
                    </strong>
                    <small style={{ color: '#64748b' }}>Paciente ID: {c.id}</small>
                  </div>
                  {unread > 0 ? (
                    <span className="chat-contacto-badge">{unread > 99 ? '99+' : unread}</span>
                  ) : null}
                </div>
              );
            })
          )}
        </aside>
        <section className="chat-window">
          <div id="chat-header-info" style={{ padding: 15, borderBottom: '1px solid #eee' }}>
            <h4 style={{ margin: 0 }}>{activo?.nombre || 'Selecciona un paciente'}</h4>
          </div>
          <div className="chat-messages-container">
            <div className="chat-messages-inner">{renderMensajes()}</div>
          </div>
          <div className="chat-input-area">
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarPdf(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              title="Adjuntar PDF"
              disabled={!chatId || sending}
              onClick={() => fileRef.current?.click()}
            >
              📎 PDF
            </button>
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={nuevoMsg}
              disabled={!chatId || sending}
              onChange={(e) => setNuevoMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarTexto()}
            />
            <button
              type="button"
              className="btn-entrar-sesion"
              disabled={!chatId || sending}
              onClick={enviarTexto}
            >
              Enviar
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (variant === 'legacy') {
    const activo = contactos.find((c) => c.id === chatId);
    return (
      <div className="chat-main-container">
        <aside className="chat-sidebar">
          <h3>Mis Especialistas</h3>
          {contactos.length === 0 ? (
            renderContactosEmpty()
          ) : (
            contactos.map((c) => {
              const unread = unreadMap[String(c.id)] || 0;
              return (
                <div
                  key={c.id}
                  className={`contacto-item-psicologo${chatId === c.id ? ' active' : ''}`}
                  onClick={() => setChatId(c.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setChatId(c.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className="contacto-item-nombre">{c.nombre}</span>
                  {unread > 0 ? (
                    <span className="chat-contacto-badge">{unread > 99 ? '99+' : unread}</span>
                  ) : null}
                </div>
              );
            })
          )}
        </aside>

        <section className="chat-window">
          <div id="chat-header-info" style={{ padding: 15, borderBottom: '1px solid #eee' }}>
            <h4 id="nombre-psicologo-chat" style={{ margin: 0 }}>
              {activo?.nombre || 'Selecciona un especialista'}
            </h4>
          </div>
          <div id="chat-messages" className="chat-messages-container">
            <div className="chat-messages-inner">{renderMensajes()}</div>
          </div>
          <div className="chat-input-area">
            <input
              ref={fileRef}
              type="file"
              id="input-chat-pdf"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) enviarPdf(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              id="btn-adjuntar-pdf-chat"
              title="Adjuntar PDF"
              disabled={!chatId || sending}
              onClick={() => fileRef.current?.click()}
            >
              📎 PDF
            </button>
            <input
              type="text"
              id="input-mensaje"
              placeholder="Escribe un mensaje..."
              value={nuevoMsg}
              disabled={!chatId || sending}
              onChange={(e) => setNuevoMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && enviarTexto()}
            />
            <button
              type="button"
              id="btn-enviar-chat"
              className="btn-entrar-sesion"
              style={{ width: 'auto', padding: '0 20px' }}
              disabled={!chatId || sending}
              onClick={enviarTexto}
            >
              Enviar
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-base">Contactos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {contactos.length === 0 ? (
            renderContactosEmpty()
          ) : (
            contactos.map((c) => {
              const unread = unreadMap[String(c.id)] || 0;
              return (
                <Button
                  key={c.id}
                  variant={chatId === c.id ? 'default' : 'outline'}
                  className="w-full justify-between"
                  onClick={() => setChatId(c.id)}
                >
                  <span className="truncate">{c.nombre}</span>
                  {unread > 0 ? (
                    <Badge className="bg-destructive text-white">{unread}</Badge>
                  ) : null}
                </Button>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardContent className="flex h-[28rem] flex-col p-4">
          {!chatId ? (
            <p className="m-auto text-sm text-muted-foreground">Selecciona un contacto</p>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto">
                {msgError ? (
                  <p className="text-sm text-destructive">{msgError}</p>
                ) : (
                  mensajes.map((m) => {
                    const esMio = miId != null && m.remitente_id === miId;
                    return (
                      <div
                        key={m.id}
                        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                          esMio ? 'ml-auto bg-primary text-white' : 'bg-muted'
                        }`}
                      >
                        {m.ruta_adjunto ? (
                          <a
                            href={`/api/chat/archivo/${m.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            📎 {m.nombre_adjunto || 'PDF adjunto'}
                          </a>
                        ) : (
                          m.contenido
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) enviarPdf(f);
                    e.target.value = '';
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => fileRef.current?.click()}
                  disabled={sending}
                  title="Adjuntar PDF"
                >
                  📎
                </Button>
                <Input
                  value={nuevoMsg}
                  onChange={(e) => setNuevoMsg(e.target.value)}
                  placeholder="Escribe un mensaje…"
                  onKeyDown={(e) => e.key === 'Enter' && enviarTexto()}
                />
                <Button onClick={enviarTexto} disabled={sending}>
                  Enviar
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
