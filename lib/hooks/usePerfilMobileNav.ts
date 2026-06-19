import { useCallback, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

/** Cierra el menú hamburguesa (header público y paneles perfil / doctor / admin). */
export function usePerfilMobileNav() {
  const navToggleRef = useRef<HTMLInputElement>(null);
  const [navOpen, setNavOpen] = useState(false);

  useBodyScrollLock(navOpen);

  const closeMobileNav = useCallback(() => {
    if (navToggleRef.current) navToggleRef.current.checked = false;
    setNavOpen(false);
  }, []);

  const onNavToggleChange = useCallback(() => {
    setNavOpen(navToggleRef.current?.checked ?? false);
  }, []);

  return { navToggleRef, closeMobileNav, onNavToggleChange };
}
