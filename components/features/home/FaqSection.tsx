import { getTranslations } from 'next-intl/server';

const FAQ_KEYS = ['q1', 'q2', 'q3', 'q4'] as const;

export async function FaqSection() {
  const t = await getTranslations('home');

  return (
    <section className="faq-section index-section index-section-alt index-faq-wrap" id="faq">
      <span className="subtitulo">{t('faqSub')}</span>
      <h2 className="index-section-title">{t('faqTitle')}</h2>
      <p className="index-section-desc">{t('faqDesc')}</p>
      <div className="faq-container faq-container-modern index-faq-panels">
        {FAQ_KEYS.map((key) => (
          <details key={key} className="faq-item faq-item-modern faq-item-v2">
            <summary>{t(`faq.${key}.question`)}</summary>
            <div className="faq-content faq-content-v2">
              <p>{t(`faq.${key}.answer`)}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
