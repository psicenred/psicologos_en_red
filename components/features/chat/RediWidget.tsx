'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import './chat-widget-legacy.css';
import { formatBotMessage } from './redi-message-format';

const WELCOME =
  'Hola, soy Redi, tu asistente de Psicólogos en Red. ¿En qué puedo ayudarte? Puedes preguntarme por horarios, cómo agendar una cita, servicios, precios o que te recomiende un especialista según lo que busques.';

const WHATSAPP_FALLBACK = 'https://wa.me/5215530776194';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  variant?: 'bot' | 'fallback';
  whatsappUrl?: string;
};

type CrisisNotice = { id: string; text: string };

function autoOpenKey() {
  return `rediAutoOpened:${typeof window !== 'undefined' ? window.location.pathname : '/'}`;
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function BotAvatar() {
  return (
    <Image
      src="/images/redi_foto_perfil.png"
      alt="Redi"
      width={28}
      height={28}
      className="chat-widget-bot-avatar"
    />
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <div className="chat-widget-msg-row">
      <div className="chat-widget-msg user">{content}</div>
    </div>
  );
}

function BotMessage({ msg }: { msg: Message }) {
  const isFallback = msg.variant === 'fallback';
  return (
    <div className="chat-widget-msg-row chat-widget-msg-row-bot">
      <BotAvatar />
      <div className={`chat-widget-msg ${isFallback ? 'bot fallback' : 'bot'}`}>
        <div dangerouslySetInnerHTML={{ __html: formatBotMessage(msg.content) }} />
        {msg.whatsappUrl ? (
          <>
            <br />
            <a
              href={msg.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="chat-widget-wa-link"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.865 9.865 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>{' '}
              Escribir por WhatsApp
            </a>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function RediWidget() {
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [crisisNotices, setCrisisNotices] = useState<CrisisNotice[]>([]);
  const historyRef = useRef<{ role: string; content: string }[]>([]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sessionStorage.getItem(autoOpenKey())) {
      const t = setTimeout(() => {
        if (sessionStorage.getItem(autoOpenKey())) return;
        sessionStorage.setItem(autoOpenKey(), '1');
        setOpen(true);
        setMessages((m) =>
          m.length ? m : [{ id: nextId(), role: 'assistant', content: WELCOME }],
        );
      }, 10000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, crisisNotices, loading, open]);

  function showWelcomeIfEmpty() {
    setMessages((m) =>
      m.length ? m : [{ id: nextId(), role: 'assistant', content: WELCOME }],
    );
  }

  function toggleOpen() {
    setOpen((v) => {
      const next = !v;
      if (next) {
        setTimeout(() => inputRef.current?.focus(), 50);
        showWelcomeIfEmpty();
      }
      return next;
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: nextId(), role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    historyRef.current = [...historyRef.current, { role: 'user', content: text }].slice(-10);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: historyRef.current }),
      });
      const data = (await res.json()) as {
        text?: string;
        message?: string;
        fallback?: boolean;
        whatsappUrl?: string;
        crisisNotice?: string;
      };

      if (data.crisisNotice) {
        setCrisisNotices((n) => [...n, { id: nextId(), text: data.crisisNotice! }]);
      }

      if (data.fallback && data.whatsappUrl) {
        const reply =
          data.message ||
          'Para más información, contáctanos por WhatsApp.';
        const botMsg: Message = {
          id: nextId(),
          role: 'assistant',
          content: reply,
          variant: 'fallback',
          whatsappUrl: data.whatsappUrl,
        };
        historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }].slice(
          -10,
        );
        setMessages((m) => [...m, botMsg]);
      } else {
        const reply =
          data.text?.trim() ||
          'No pude generar una respuesta. ¿Quieres que te pasemos con un especialista por WhatsApp?';
        const botMsg: Message = { id: nextId(), role: 'assistant', content: reply };
        historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }].slice(
          -10,
        );
        setMessages((m) => [...m, botMsg]);
      }
    } catch {
      const errMsg =
        'No se pudo conectar. Para recibir respuesta, dirígete con nuestros especialistas por WhatsApp.';
      setMessages((m) => [
        ...m,
        {
          id: nextId(),
          role: 'assistant',
          content: errMsg,
          variant: 'fallback',
          whatsappUrl: WHATSAPP_FALLBACK,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-widget-wrap">
      <div
        className={`chat-widget-panel${open ? ' open' : ''}`}
        id="chat-widget-panel"
        role="dialog"
        aria-label="Chat con Redi"
      >
        <div className="chat-widget-header">
          <Image
            src="/images/redi_foto_perfil.png"
            alt=""
            width={36}
            height={36}
            className="chat-widget-header-avatar"
          />
          <span>Redi</span>
          <button
            type="button"
            className="chat-widget-minimize"
            aria-label="Minimizar chat"
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M19 13H5v-2h14v2z" />
            </svg>
          </button>
        </div>

        <div className="chat-widget-messages" id="chat-widget-messages" ref={messagesRef}>
          {messages.map((msg) =>
            msg.role === 'user' ? (
              <UserMessage key={msg.id} content={msg.content} />
            ) : (
              <BotMessage key={msg.id} msg={msg} />
            ),
          )}
          {crisisNotices.map((n) => (
            <div key={n.id} className="chat-widget-msg-row chat-widget-crisis-row">
              <div className="chat-widget-crisis-notice">{n.text}</div>
            </div>
          ))}
          {loading ? (
            <div className="chat-widget-msg-row chat-widget-msg-row-bot chat-widget-typing-row">
              <BotAvatar />
              <div className="chat-widget-typing">Escribiendo</div>
            </div>
          ) : null}
        </div>

        <div className="chat-widget-input-wrap">
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            className="chat-widget-input"
            placeholder="Escribe tu pregunta..."
            maxLength={500}
            autoComplete="off"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button
            type="button"
            className="chat-widget-send"
            aria-label="Enviar"
            disabled={loading}
            onClick={send}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      <button
        type="button"
        className="chat-widget-btn"
        aria-label="Abrir chat"
        onClick={toggleOpen}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 3 .97 4.29L2 22l5.71-.97C9 21.64 10.46 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z" />
        </svg>
      </button>
    </div>
  );
}
