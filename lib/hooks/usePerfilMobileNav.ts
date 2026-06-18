import { useCallback, useEffect, useRef } from 'react';

function setBodyScrollLocked(locked: boolean) {
  document.body.style.overflow = locked ? 'hidden' : '';
}

/** Cierra el menú hamburguesa (header público y paneles perfil / doctor / admin). */
export function usePerfilMobileNav() {
  const navToggleRef = useRef<HTMLInputElement>(null);

  const closeMobileNav = useCallback(() => {
    if (navToggleRef.current) navToggleRef.current.checked = false;
    setBodyScrollLocked(false);
  }, []);

  const onNavToggleChange = useCallback(() => {
    if (navToggleRef.current) setBodyScrollLocked(navToggleRef.current.checked);
  }, []);

  useEffect(() => () => setBodyScrollLocked(false), []);

  return { navToggleRef, closeMobileNav, onNavToggleChange };
}
