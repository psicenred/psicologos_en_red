'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

export function InstallAppButton() {
  const t = useTranslations('footer');
  const [modalOpen, setModalOpen] = useState(false);
  const installPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      installPrompt.current = e as BeforeInstallPromptEvent;
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  async function handleClick() {
    if (installPrompt.current) {
      await installPrompt.current.prompt();
      installPrompt.current = null;
      return;
    }
    setModalOpen(true);
  }

  return (
    <>
      <p style={{ marginTop: 8 }}>
        <button type="button" className="footer-install-btn" onClick={handleClick}>
          📲 {t('installApp')}
        </button>
      </p>

      <div
        className={`footer-install-overlay${modalOpen ? ' visible' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModalOpen(false);
        }}
      >
        <div className="footer-install-modal">
          <h3>{t('installTitle')}</h3>
          <p>{t('installInstructions')}</p>
          <p className="note">{t('installNote')}</p>
          <button type="button" className="footer-install-close" onClick={() => setModalOpen(false)}>
            {t('installClose')}
          </button>
        </div>
      </div>
    </>
  );
}
