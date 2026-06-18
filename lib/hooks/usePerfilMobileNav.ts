import { useCallback, useRef } from 'react';

/** Cierra el menú hamburguesa de paneles perfil / doctor / admin. */
export function usePerfilMobileNav() {
  const navToggleRef = useRef<HTMLInputElement>(null);

  const closeMobileNav = useCallback(() => {
    if (navToggleRef.current) navToggleRef.current.checked = false;
  }, []);

  return { navToggleRef, closeMobileNav };
}
