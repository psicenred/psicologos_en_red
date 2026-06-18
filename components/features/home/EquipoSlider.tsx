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

function itemsToShowForWidth(width: number, slideCount: number) {
  if (width <= 768) return Math.min(2, slideCount);
  if (width <= 992) return Math.min(3, slideCount);
  return Math.min(4, slideCount);
}

export function EquipoSlider() {
  const t = useTranslations('home');
  const [list, setList] = useState<Psicologo[]>([]);
  const [itemsToShow, setItemsToShow] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    fetchJsonArray<Psicologo>('/api/psicologos').then(({ data }) => setList(data));
  }, []);

  useEffect(() => {
    function updateItemsToShow() {
      setItemsToShow(itemsToShowForWidth(window.innerWidth, Math.max(list.length, 1)));
    }
    updateItemsToShow();
    window.addEventListener('resize', updateItemsToShow);
    return () => window.removeEventListener('resize', updateItemsToShow);
  }, [list.length]);

  useEffect(() => {
    if (list.length === 0) return;
    const sliderEl = containerRef.current;
    if (!sliderEl) return;

    const visible = itemsToShowForWidth(window.innerWidth, list.length);
    indexRef.current = visible;

    let cleanup: (() => void) | undefined;

    const timer = setTimeout(() => {
      const root: HTMLDivElement = sliderEl;

      const slides = Array.from(
        root.querySelectorAll(':scope > .equipo-slide:not([data-clone="1"])'),
      ) as HTMLElement[];
      if (slides.length === 0) return;

      root.querySelectorAll(':scope > .equipo-slide[data-clone="1"]').forEach((n) => n.remove());

      for (let i = 0; i < visible; i++) {
        const startClone = slides[i].cloneNode(true) as HTMLElement;
        startClone.setAttribute('data-clone', '1');
        root.appendChild(startClone);
        const endClone = slides[slides.length - 1 - (i % slides.length)].cloneNode(
          true,
        ) as HTMLElement;
        endClone.setAttribute('data-clone', '1');
        root.insertBefore(endClone, slides[0]);
      }

      function allSlides() {
        return Array.from(
          root.querySelectorAll(':scope > .equipo-slide'),
        ) as HTMLElement[];
      }

      function updateSlider(smooth = true) {
        const nodes = allSlides();
        if (!nodes[0]) return;
        const slideWidth = nodes[0].offsetWidth;
        root.style.transition = smooth ? 'transform 0.5s ease-in-out' : 'none';
        root.style.transform = `translateX(${-indexRef.current * slideWidth}px)`;
      }

      updateSlider(false);

      function moveNext() {
        const nodes = allSlides();
        indexRef.current += 1;
        updateSlider(true);
        if (indexRef.current >= nodes.length - visible) {
          setTimeout(() => {
            indexRef.current = visible;
            updateSlider(false);
          }, 500);
        }
      }

      let autoPlay = setInterval(moveNext, 3000);
      const onEnter = () => clearInterval(autoPlay);
      const onLeave = () => {
        autoPlay = setInterval(moveNext, 3000);
      };
      const onResize = () => updateSlider(false);

      root.addEventListener('mouseenter', onEnter);
      root.addEventListener('mouseleave', onLeave);
      window.addEventListener('resize', onResize);

      cleanup = () => {
        clearInterval(autoPlay);
        root.removeEventListener('mouseenter', onEnter);
        root.removeEventListener('mouseleave', onLeave);
        window.removeEventListener('resize', onResize);
        root.querySelectorAll(':scope > .equipo-slide[data-clone="1"]').forEach((n) => n.remove());
        root.style.transform = '';
        root.style.transition = '';
      };
    }, 150);

    return () => {
      clearTimeout(timer);
      cleanup?.();
    };
  }, [list, itemsToShow]);

  if (list.length === 0) return null;

  return (
    <section className="equipo-slider-section" id="nuestro-equipo">
      <h2 style={{ textAlign: 'center', color: 'var(--texto-oscuro)', marginBottom: '40px' }}>
        {t('teamTitle')}
      </h2>
      <div
        className="equipo-slider-viewport"
        style={{
          ['--equipo-num-slides' as string]: String(list.length),
          ['--equipo-items-visible' as string]: String(itemsToShow),
        }}
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
