'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchJsonArray } from '@/lib/fetch-api';

type Testimonio = {
  comentario: string;
  valoracion: number | string;
  nombre: string;
  rol?: string;
};

const FALLBACK: Testimonio[] = [
  {
    nombre: 'Juan S.',
    comentario:
      'La plataforma es súper sencilla de usar. Encontré al psicólogo ideal para mi proceso.',
    valoracion: 5,
    rol: 'Paciente',
  },
  {
    nombre: 'María L.',
    comentario:
      'Me encanta la privacidad que ofrece. Poder tomar mi terapia desde casa me ha cambiado la vida.',
    valoracion: 5,
    rol: 'Paciente',
  },
  {
    nombre: 'Dr. Roberto B.',
    comentario:
      'Como profesional, la red me permite organizar mis consultas y llegar a quienes necesitan apoyo.',
    valoracion: 5,
    rol: 'Psicólogo',
  },
];

const DELAYS = [4000, 5500, 7000];

function stars(n: number | string) {
  const count = Math.min(5, Math.max(0, parseInt(String(n), 10) || 5));
  return '★'.repeat(count) + '☆'.repeat(5 - count);
}

function initial(nombre: string) {
  const s = (nombre || '').trim();
  return s ? s.charAt(0).toUpperCase() : '—';
}

function formatRole(rol?: string) {
  if (rol === 'psicologo' || rol === 'Psicólogo') return 'Psicólogo';
  if (rol === 'paciente' || rol === 'Paciente') return 'Paciente';
  return rol || '—';
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function TestimoniosSection() {
  const t = useTranslations('home');
  const [items, setItems] = useState<Testimonio[]>([]);
  const [display, setDisplay] = useState<[Testimonio, Testimonio, Testimonio]>([
    FALLBACK[0],
    FALLBACK[1],
    FALLBACK[2],
  ]);
  const [fading, setFading] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const indicesRef = useRef([0, 0, 0]);
  const listRef = useRef<Testimonio[]>(FALLBACK);

  useEffect(() => {
    fetchJsonArray<Testimonio>('/api/testimonios-encuesta').then(({ data }) => {
      if (data.length > 0) {
        const next = shuffle(data).slice(0, 9);
        listRef.current = next;
        setItems(next);
      }
    });
  }, []);

  useEffect(() => {
    const list = listRef.current;

    function renderBlock(blockIndex: number) {
      const listLen = list.length;
      if (listLen === 0) return;

      indicesRef.current[blockIndex] =
        ((indicesRef.current[blockIndex] % listLen) + listLen) % listLen;
      const item = list[indicesRef.current[blockIndex]];

      setFading((prev) => {
        const next = [...prev] as [boolean, boolean, boolean];
        next[blockIndex] = true;
        return next;
      });

      window.setTimeout(() => {
        setDisplay((prev) => {
          const next = [...prev] as [Testimonio, Testimonio, Testimonio];
          next[blockIndex] = item;
          return next;
        });
        setFading((prev) => {
          const next = [...prev] as [boolean, boolean, boolean];
          next[blockIndex] = false;
          return next;
        });
      }, 350);
    }

    const timers: ReturnType<typeof setInterval>[] = [];
    for (let b = 0; b < 3; b++) {
      renderBlock(b);
      timers.push(
        setInterval(() => {
          indicesRef.current[b] += 1;
          renderBlock(b);
        }, DELAYS[b]),
      );
    }

    return () => timers.forEach(clearInterval);
  }, [items]);

  return (
    <section
      className="testimonios-section index-section index-testimonios-wrap"
      id="testimonios-section"
    >
      <span className="subtitulo">{t('testimonialsSub')}</span>
      <h2 className="index-section-title">{t('testimonialsTitle')}</h2>
      <p className="index-section-desc">{t('testimonialsDesc')}</p>
      <div className="testimonios-container index-testimonios-cards testimonios-triple-wrap">
        {display.map((item, i) => (
          <div
            key={`${i}-${item.nombre}-${item.comentario.slice(0, 24)}`}
            className={`testimonio-card index-testimonio-v2 testimonio-rotador-card${fading[i] ? ' fade-out' : ''}`}
          >
            <div className="testimonio-stars">{stars(item.valoracion)}</div>
            <p className="testimonio-quote">{item.comentario}</p>
            <div className="testimonio-author">
              <div className="testimonio-avatar testimonio-avatar-rosa">{initial(item.nombre)}</div>
              <div className="testimonio-info">
                <strong className="testimonio-name">
                  {initial(item.nombre) !== '—' ? `${initial(item.nombre)}.` : '—'}
                </strong>
                <span>{formatRole(item.rol)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
