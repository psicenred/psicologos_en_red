'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    ) || window.innerWidth <= 768
  );
}

function isNativeFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement);
}

export function useVideoFullscreen(containerRef: React.RefObject<HTMLElement | null>) {
  const [pseudoFs, setPseudoFs] = useState(false);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  const isFullscreen = pseudoFs || isNativeFullscreen();

  const removeCloseButton = useCallback(() => {
    closeBtnRef.current?.remove();
    closeBtnRef.current = null;
  }, []);

  const exitFullscreen = useCallback(() => {
    if (isNativeFullscreen()) {
      const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
      (document.exitFullscreen || doc.webkitExitFullscreen)?.call(document);
    }
    if (pseudoFs) {
      document.body.classList.remove('video-pseudo-fullscreen');
      setPseudoFs(false);
      removeCloseButton();
    }
  }, [pseudoFs, removeCloseButton]);

  const enterPseudoFullscreen = useCallback(() => {
    document.body.classList.add('video-pseudo-fullscreen');
    setPseudoFs(true);

    const cont = containerRef.current;
    if (!cont || closeBtnRef.current) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'jitsi-fs-cerrar';
    btn.setAttribute('aria-label', 'Salir de pantalla completa');
    btn.innerHTML = '✕';
    btn.addEventListener('click', exitFullscreen);
    cont.appendChild(btn);
    closeBtnRef.current = btn;
  }, [containerRef, exitFullscreen]);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      exitFullscreen();
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    if (isMobileViewport()) {
      enterPseudoFullscreen();
      return;
    }

    const htmlEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    (el.requestFullscreen || htmlEl.webkitRequestFullscreen)?.call(el);
  }, [containerRef, enterPseudoFullscreen, exitFullscreen, isFullscreen]);

  useEffect(() => {
    function onFullscreenChange() {
      if (!isNativeFullscreen()) {
        removeCloseButton();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isFullscreen) {
        e.preventDefault();
        e.stopPropagation();
        exitFullscreen();
      }
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('keydown', onKeyDown, true);
      document.body.classList.remove('video-pseudo-fullscreen');
      removeCloseButton();
    };
  }, [exitFullscreen, isFullscreen, removeCloseButton]);

  return {
    toggleFullscreen,
    isFullscreen,
    buttonLabel: isFullscreen ? '✕ Salir de pantalla completa' : '⛶ Pantalla completa',
  };
}
