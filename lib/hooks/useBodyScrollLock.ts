import { useEffect } from 'react';

let scrollLockCount = 0;
let savedBodyOverflow = '';
let savedHtmlOverflow = '';
let savedBodyPointerEvents = '';

function applyScrollLock() {
  if (scrollLockCount === 0) {
    savedBodyOverflow = document.body.style.overflow;
    savedHtmlOverflow = document.documentElement.style.overflow;
    savedBodyPointerEvents = document.body.style.pointerEvents;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }
  scrollLockCount += 1;
}

function removeScrollLock() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount !== 0) return;

  document.body.style.overflow = savedBodyOverflow;
  document.documentElement.style.overflow = savedHtmlOverflow;
  document.body.style.pointerEvents = savedBodyPointerEvents;
  savedBodyOverflow = '';
  savedHtmlOverflow = '';
  savedBodyPointerEvents = '';

  document.body.removeAttribute('data-scroll-locked');
  document.documentElement.removeAttribute('data-scroll-locked');
}

/** Fuerza liberar bloqueos (p. ej. tras Radix Dialog o modales legacy). */
export function releaseAllBodyScrollLocks() {
  scrollLockCount = 0;
  document.body.style.overflow = '';
  document.documentElement.style.overflow = '';
  document.body.style.pointerEvents = '';
  document.body.removeAttribute('data-scroll-locked');
  document.documentElement.removeAttribute('data-scroll-locked');
  savedBodyOverflow = '';
  savedHtmlOverflow = '';
  savedBodyPointerEvents = '';
}

/** Bloquea scroll del body con contador ref (varios modales pueden coexistir). */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    applyScrollLock();
    return () => removeScrollLock();
  }, [active]);
}
