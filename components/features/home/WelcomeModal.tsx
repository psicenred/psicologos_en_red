'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

type ModalStep =
  | 'welcome'
  | 'service'
  | 'age'
  | 'minors'
  | 'survey'
  | 'result'
  | 'returning';

type SurveyOption = { text: string; value: string };
type SurveyQuestion = { text: string; options: SurveyOption[] };

const WelcomeModalContext = createContext<{ openModal: () => void }>({
  openModal: () => {},
});

export function useWelcomeModal() {
  return useContext(WelcomeModalContext);
}

export function WelcomeModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);

  return (
    <WelcomeModalContext.Provider value={{ openModal }}>
      {children}
      <WelcomeModal open={open} onClose={closeModal} />
      <WelcomeModalAutoOpen onOpen={openModal} />
    </WelcomeModalContext.Provider>
  );
}

function WelcomeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations('home.modal');
  const [step, setStep] = useState<ModalStep>('welcome');
  const [surveyStep, setSurveyStep] = useState(1);
  const [surveyAnswers, setSurveyAnswers] = useState<(string | null)[]>([
    null,
    null,
    null,
    null,
    null,
  ]);
  const [catalogHref, setCatalogHref] = useState('/catalogo');

  const questions = useMemo<SurveyQuestion[]>(
    () => [
      {
        text: t('survey.q1'),
        options: [
          { text: t('survey.q1a'), value: 'TCC' },
          { text: t('survey.q1b'), value: 'Psicoanalisis' },
          { text: t('survey.q1c'), value: 'Sistemica' },
          { text: t('survey.q1d'), value: 'Humanista' },
        ],
      },
      {
        text: t('survey.q2'),
        options: [
          { text: t('survey.q2a'), value: 'TCC' },
          { text: t('survey.q2b'), value: 'Psicoanalisis' },
          { text: t('survey.q2c'), value: 'Sistemica' },
          { text: t('survey.q2d'), value: 'Humanista' },
        ],
      },
      {
        text: t('survey.q3'),
        options: [
          { text: t('survey.q3a'), value: 'TCC' },
          { text: t('survey.q3b'), value: 'Psicoanalisis' },
          { text: t('survey.q3c'), value: 'Sistemica' },
          { text: t('survey.q3d'), value: 'Humanista' },
        ],
      },
      {
        text: t('survey.q4'),
        options: [
          { text: t('survey.q4a'), value: 'TCC' },
          { text: t('survey.q4b'), value: 'Psicoanalisis' },
          { text: t('survey.q4c'), value: 'Sistemica' },
          { text: t('survey.q4d'), value: 'Humanista' },
        ],
      },
      {
        text: t('survey.q5'),
        options: [
          { text: t('survey.q5a'), value: 'TCC' },
          { text: t('survey.q5b'), value: 'Psicoanalisis' },
          { text: t('survey.q5c'), value: 'Sistemica' },
          { text: t('survey.q5d'), value: 'Humanista' },
        ],
      },
    ],
    [t],
  );

  function reset() {
    setStep('welcome');
    setSurveyStep(1);
    setSurveyAnswers([null, null, null, null, null]);
    setCatalogHref('/catalogo');
  }

  function close() {
    onClose();
    reset();
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function pickSurveyOption(option: SurveyOption) {
    const next = [...surveyAnswers];
    next[surveyStep - 1] = option.value;
    setSurveyAnswers(next);

    if (surveyStep < 5) {
      setSurveyStep(surveyStep + 1);
      return;
    }

    const scores = { TCC: 0, Psicoanalisis: 0, Sistemica: 0, Humanista: 0 };
    next.forEach((v) => {
      if (v && v in scores) scores[v as keyof typeof scores] += 1;
    });
    const max = Math.max(scores.TCC, scores.Psicoanalisis, scores.Sistemica, scores.Humanista);
    const winners = (Object.keys(scores) as (keyof typeof scores)[]).filter(
      (k) => scores[k] === max,
    );
    const winner =
      winners.length === 1
        ? winners[0]
        : winners[Math.floor(Math.random() * winners.length)];
    setCatalogHref(`/catalogo?corriente=${encodeURIComponent(winner)}`);
    setStep('result');
  }

  if (!open) return null;

  return (
    <div
      className="modal-bienvenida-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-bienvenida-box">
        <button
          type="button"
          className="modal-bienvenida-cerrar"
          onClick={close}
          aria-label={t('close')}
        >
          &times;
        </button>

        {step === 'welcome' ? (
          <div className="modal-bienvenida-paso">
            <h2 className="modal-bienvenida-titulo">{t('welcomeQuestion')}</h2>
            <p className="modal-bienvenida-sub">{t('welcomeSub')}</p>
            <div className="modal-bienvenida-botones">
              <button
                type="button"
                className="modal-bienvenida-btn modal-bienvenida-btn-nuevo"
                onClick={() => setStep('service')}
              >
                {t('newUser')}
              </button>
              <button
                type="button"
                className="modal-bienvenida-btn modal-bienvenida-btn-conozco"
                onClick={() => setStep('returning')}
              >
                {t('returningUser')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'service' ? (
          <div className="modal-bienvenida-paso">
            <button
              type="button"
              className="modal-bienvenida-volver"
              onClick={() => setStep('welcome')}
            >
              ← {t('back')}
            </button>
            <h2 className="modal-bienvenida-titulo">{t('serviceQuestion')}</h2>
            <p className="modal-bienvenida-sub">{t('serviceSub')}</p>
            <div className="modal-bienvenida-opciones">
              <button
                type="button"
                className="modal-bienvenida-opcion modal-bienvenida-opcion-btn"
                onClick={() => setStep('age')}
              >
                {t('individualTherapy')}
              </button>
              <Link
                href="/catalogo?servicio=Terapia%20de%20pareja"
                className="modal-bienvenida-opcion"
                onClick={close}
              >
                {t('coupleTherapy')}
              </Link>
              <Link href="/academia" className="modal-bienvenida-opcion" onClick={close}>
                {t('diplomas')}
              </Link>
            </div>
          </div>
        ) : null}

        {step === 'age' ? (
          <div className="modal-bienvenida-paso">
            <button
              type="button"
              className="modal-bienvenida-volver"
              onClick={() => setStep('service')}
            >
              ← {t('back')}
            </button>
            <h2 className="modal-bienvenida-titulo">{t('ageQuestion')}</h2>
            <p className="modal-bienvenida-sub">{t('ageSub')}</p>
            <div className="modal-bienvenida-opciones">
              <button
                type="button"
                className="modal-bienvenida-opcion modal-bienvenida-opcion-btn"
                onClick={() => {
                  setSurveyStep(1);
                  setSurveyAnswers([null, null, null, null, null]);
                  setStep('survey');
                }}
              >
                {t('over18')}
              </button>
              <button
                type="button"
                className="modal-bienvenida-opcion modal-bienvenida-opcion-btn"
                onClick={() => setStep('minors')}
              >
                {t('under18')}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'minors' ? (
          <div className="modal-bienvenida-paso">
            <h2 className="modal-bienvenida-titulo modal-bienvenida-titulo-rosa">
              {t('minorsTitle')}
            </h2>
            <p className="modal-bienvenida-mensaje">
              {t('minorsMessage')}{' '}
              <a href="mailto:contacto@psicologosenred.com" className="modal-enlace-email">
                contacto@psicologosenred.com
              </a>
            </p>
            <button
              type="button"
              className="modal-bienvenida-btn modal-bienvenida-btn-cta"
              onClick={close}
            >
              {t('understood')}
            </button>
          </div>
        ) : null}

        {step === 'survey' ? (
          <div className="modal-bienvenida-paso">
            <button
              type="button"
              className="modal-bienvenida-volver"
              onClick={() => {
                if (surveyStep === 1) setStep('age');
                else setSurveyStep(surveyStep - 1);
              }}
            >
              ← {t('back')}
            </button>
            <p className="encuesta-indicador">
              {t('surveyProgress', { current: surveyStep, total: 5 })}
            </p>
            <h2 className="modal-bienvenida-titulo encuesta-pregunta-titulo">
              {questions[surveyStep - 1]?.text}
            </h2>
            <div className="modal-bienvenida-opciones">
              {questions[surveyStep - 1]?.options.map((opt) => (
                <button
                  key={opt.value + opt.text.slice(0, 20)}
                  type="button"
                  className="modal-bienvenida-opcion modal-bienvenida-opcion-btn"
                  onClick={() => pickSurveyOption(opt)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 'result' ? (
          <div className="modal-bienvenida-paso">
            <h2 className="modal-bienvenida-titulo modal-bienvenida-titulo-rosa">
              {t('resultTitle')}
            </h2>
            <p className="modal-bienvenida-mensaje">{t('resultMessage')}</p>
            <Link
              href={catalogHref}
              className="modal-bienvenida-btn modal-bienvenida-btn-cta"
              onClick={close}
            >
              {t('resultCta')}
            </Link>
          </div>
        ) : null}

        {step === 'returning' ? (
          <div className="modal-bienvenida-paso">
            <h2 className="modal-bienvenida-titulo modal-bienvenida-titulo-rosa">
              {t('returningTitle')}
            </h2>
            <p className="modal-bienvenida-mensaje">{t('returningMessage')}</p>
            <div className="modal-bienvenida-botones modal-bienvenida-botones-tres">
              <Link
                href="/catalogo"
                className="modal-bienvenida-btn modal-bienvenida-btn-cta"
                onClick={close}
              >
                {t('goCatalog')}
              </Link>
              <Link
                href="/academia"
                className="modal-bienvenida-btn modal-bienvenida-btn-cta"
                onClick={close}
              >
                {t('goAcademy')}
              </Link>
              <button
                type="button"
                className="modal-bienvenida-btn modal-bienvenida-btn-sec"
                onClick={close}
              >
                {t('close')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function OpenWelcomeModalButton({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const { openModal } = useWelcomeModal();
  return (
    <a
      href="#"
      id={id}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        openModal();
      }}
    >
      {children}
    </a>
  );
}

function WelcomeModalAutoOpen({ onOpen }: { onOpen: () => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get('modal') === 'agendar') {
      const id = setTimeout(onOpen, 100);
      return () => clearTimeout(id);
    }
  }, [searchParams, onOpen]);

  return null;
}
