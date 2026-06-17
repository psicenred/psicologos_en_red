'use client';

import { useEffect, useRef } from 'react';

function activateScripts(container: HTMLElement) {
  container.querySelectorAll('script').forEach((oldScript) => {
    const script = document.createElement('script');

    for (const attr of oldScript.attributes) {
      script.setAttribute(attr.name, attr.value);
    }

    if (oldScript.textContent) {
      script.textContent = oldScript.textContent;
    }

    oldScript.replaceWith(script);
  });
}

interface LegacyPageClientProps {
  html: string;
}

/**
 * Monta HTML legacy (views/*.html) y re-ejecuta <script> inline/externos.
 * Patrón puente Fase 2: paridad visual sin reescribir ~700+ líneas por página.
 */
export default function LegacyPageClient({ html }: LegacyPageClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptsForHtml = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || scriptsForHtml.current === html) return;
    scriptsForHtml.current = html;
    activateScripts(container);
  }, [html]);

  return (
    <div
      ref={containerRef}
      className="legacy-page-root"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
