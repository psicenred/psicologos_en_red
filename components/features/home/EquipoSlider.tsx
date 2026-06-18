'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { fetchJsonArray } from '@/lib/fetch-api';

type Psicologo = {
  id: number;
  nombre: string;
  imagen_url: string | null;
};

function shortName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  }
  return full || '—';
}

export function EquipoSlider() {
  const t = useTranslations('home');
  const [list, setList] = useState<Psicologo[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const setupRef = useRef(false);

  useEffect(() => {
    fetchJsonArray<Psicologo>('/api/psicologos').then(({ data }) => setList(data));
  }, []);

  useEffect(() => {
    if (list.length === 0 || setupRef.current) return;
    const container = containerRef.current;
    if (!container) return;

    const timer = setTimeout(() => {
      const slides = Array.from(
        container.querySelectorAll(':scope > .equipo-slide'),
      ) as HTMLElement[];
      if (slides.length === 0) return;

      setupRef.current = true;
      const itemsToShow = Math.min(4, slides.length);
      indexRef.current = itemsToShow;

      for (let i = 0; i < itemsToShow; i++) {
        container.appendChild(slides[i].cloneNode(true));
        container.insertBefore(
          slides[slides.length - 1 - (i % slides.length)].cloneNode(true),
          slides[0],
        );
      }

      function allSlides() {
        return Array.from(
          container!.querySelectorAll(':scope > .equipo-slide'),
        ) as HTMLElement[];
      }

      function updateSlider(smooth = true) {
        const nodes = allSlides();
        if (!nodes[0]) return;
        const slideWidth = nodes[0].offsetWidth;
        container!.style.transition = smooth ? 'transform 0.5s ease-in-out' : 'none';
        container!.style.transform = `translateX(${-indexRef.current * slideWidth}px)`;
      }

      updateSlider(false);

      function moveNext() {
        const nodes = allSlides();
        indexRef.current += 1;
        updateSlider(true);
        if (indexRef.current >= nodes.length - itemsToShow) {
          setTimeout(() => {
            indexRef.current = itemsToShow;
            updateSlider(false);
          }, 500);
        }
      }

      let autoPlay = setInterval(moveNext, 3000);
      const onEnter = () => clearInterval(autoPlay);
      const onLeave = () => {
        autoPlay = setInterval(moveNext, 3000);
      };
      container.addEventListener('mouseenter', onEnter);
      container.addEventListener('mouseleave', onLeave);
      window.addEventListener('resize', () => updateSlider(false));

      return () => {
        clearInterval(autoPlay);
        container.removeEventListener('mouseenter', onEnter);
        container.removeEventListener('mouseleave', onLeave);
      };
    }, 150);

    return () => clearTimeout(timer);
  }, [list]);

  if (list.length === 0) return null;

  return (
    <section className="equipo-slider-section" id="nuestro-equipo">
      <h2 style={{ textAlign: 'center', color: 'var(--texto-oscuro)', marginBottom: '40px' }}>
        {t('teamTitle')}
      </h2>
      <div
        className="equipo-slider-viewport"
        style={{ ['--equipo-num-slides' as string]: String(list.length) }}
      >
        <div ref={containerRef} className="equipo-slider-container">
          {list.map((p) => {
            const imgSrc =
              (p.imagen_url && p.imagen_url.trim()) || '/images/nuestros_psicologos.jpg';
            return (
              <Link
                key={p.id}
                href={`/catalogo?ver=${p.id}`}
                className="equipo-slide"
                aria-label={`Ver perfil de ${p.nombre}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imgSrc} alt={p.nombre} />
                <span className="nombre-equipo">{shortName(p.nombre)}</span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="slider-nav-dots" />
    </section>
  );
}
