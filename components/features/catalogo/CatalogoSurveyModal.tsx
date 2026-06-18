'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

type SurveyOption = { text: string; value: string };

export function CatalogoSurveyModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('home.modal');
  const [step, setStep] = useState<'survey' | 'result'>('survey');
  const [surveyStep, setSurveyStep] = useState(1);
  const [catalogHref, setCatalogHref] = useState('/catalogo');

  const questions = useMemo(
    () =>
      [1, 2, 3, 4, 5].map((n) => ({
        text: t(`survey.q${n}` as 'survey.q1'),
        options: ['a', 'b', 'c', 'd'].map((letter) => ({
          text: t(`survey.q${n}${letter}` as 'survey.q1a'),
          value: ['TCC', 'Psicoanalisis', 'Sistemica', 'Humanista'][['a', 'b', 'c', 'd'].indexOf(letter)],
        })) as SurveyOption[],
      })),
    [t],
  );

  function reset() {
    setStep('survey');
    setSurveyStep(1);
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

  const [answers, setAnswers] = useState<(string | null)[]>([null, null, null, null, null]);

  useEffect(() => {
    if (open) {
      setAnswers([null, null, null, null, null]);
      setSurveyStep(1);
      setStep('survey');
    }
  }, [open]);

  function handlePick(option: SurveyOption) {
    const next = [...answers];
    next[surveyStep - 1] = option.value;
    setAnswers(next);

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

        {step === 'survey' ? (
          <div className="modal-bienvenida-paso">
            <button
              type="button"
              className="modal-bienvenida-volver"
              onClick={() => {
                if (surveyStep === 1) close();
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
                  key={opt.value + opt.text.slice(0, 16)}
                  type="button"
                  className="modal-bienvenida-opcion modal-bienvenida-opcion-btn"
                  onClick={() => handlePick(opt)}
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
      </div>
    </div>
  );
}
