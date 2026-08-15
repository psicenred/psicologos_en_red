'use client';

import { useCallback, useEffect, useState } from 'react';

export function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.matchMedia('(max-width: 768px)').matches
  );
}

function getFullscreenElement(): Element | null {
  if (typeof document === 'undefined') return null;
  const doc = document as Document & { webkitFullscreenElement?: Element | null };
  return document.fullscreenElement || doc.webkitFullscreenElement || null;
}

function requestNativeFullscreen(el: HTMLElement): boolean {
  const htmlEl = el as HTMLElement & {
    webkitRequestFullscreen?: () => void | Promise<void>;
    webkitRequestFullScreen?: () => void | Promise<void>;
  };
  const req =
    el.requestFullscreen?.bind(el) ||
    htmlEl.webkitRequestFullscreen?.bind(el) ||
    htmlEl.webkitRequestFullScreen?.bind(el);
  if (!req) return false;
  try {
    void req();
    return true;
  } catch {
    return false;
  }
}

function exitNativeFullscreen(): void {
  const doc = document as Document & {
    webkitExitFullscreen?: () => void | Promise<void>;
    webkitCancelFullScreen?: () => void | Promise<void>;
  };
  const exit =
    document.exitFullscreen?.bind(document) ||
    doc.webkitExitFullscreen?.bind(document) ||
    doc.webkitCancelFullScreen?.bind(document);
  try {
    void exit?.();
  } catch {
    // ignore
  }
}

export function bumpVideoLayout(): void {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
  });
}

/**
 * Pantalla completa para videollamada.
 * En móvil usa pseudo-fullscreen (CSS y/o portal a body) porque iOS
 * no soporta requestFullscreen en divs.
 */
export function useVideoFullscreen(containerRef: React.RefObject<HTMLElement | null>) {
  const [pseudoFs, setPseudoFs] = useState(false);
  const [nativeFs, setNativeFs] = useState(false);

  const isFullscreen = pseudoFs || nativeFs;

  const clearPseudo = useCallback(() => {
    document.body.classList.remove('video-pseudo-fullscreen');
    document.documentElement.classList.remove('video-pseudo-fullscreen');
    setPseudoFs(false);
  }, []);

  const enterPseudoFullscreen = useCallback(() => {
    document.documentElement.classList.add('video-pseudo-fullscreen');
    document.body.classList.add('video-pseudo-fullscreen');
    setPseudoFs(true);
    bumpVideoLayout();
  }, []);

  const exitFullscreen = useCallback(() => {
    if (getFullscreenElement()) {
      exitNativeFullscreen();
    }
    clearPseudo();
    bumpVideoLayout();
  }, [clearPseudo]);

  const toggleFullscreen = useCallback(() => {
    if (pseudoFs || getFullscreenElement()) {
      exitFullscreen();
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    // Móvil / iOS: siempre pseudo-fullscreen
    if (isMobileViewport()) {
      enterPseudoFullscreen();
      return;
    }

    // Desktop: API nativa; si falla, fallback CSS
    const ok = requestNativeFullscreen(el);
    if (!ok) {
      enterPseudoFullscreen();
    }
  }, [containerRef, enterPseudoFullscreen, exitFullscreen, pseudoFs]);

  useEffect(() => {
    function onFullscreenChange() {
      const active = !!getFullscreenElement();
      setNativeFs(active);
      if (!active) {
        clearPseudo();
      }
      bumpVideoLayout();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (!pseudoFs && !getFullscreenElement()) return;
      e.preventDefault();
      e.stopPropagation();
      exitFullscreen();
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.classList.remove('video-pseudo-fullscreen');
      document.documentElement.classList.remove('video-pseudo-fullscreen');
    };
  }, [clearPseudo, exitFullscreen, pseudoFs]);

  return {
    toggleFullscreen,
    exitFullscreen,
    isFullscreen,
    isPseudoFullscreen: pseudoFs,
    buttonLabel: isFullscreen ? '✕ Salir de pantalla completa' : '⛶ Pantalla completa',
  };
}
