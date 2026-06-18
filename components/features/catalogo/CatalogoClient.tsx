'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AgendarDialog } from '@/components/features/catalogo/AgendarDialog';
import { CatalogoSurveyModal } from '@/components/features/catalogo/CatalogoSurveyModal';
import { PerfilPsicologoModal } from '@/components/features/catalogo/PerfilPsicologoModal';
import { fetchJsonArray } from '@/lib/fetch-api';
import { fetchPrecioRegionClient } from '@/lib/geo-client';
import { minSessionPrice } from '@/lib/catalog-pricing';
import { asStringArray } from '@/lib/pg-arrays';
import { PRECIOS_DEFAULT_MXN, PRECIOS_DEFAULT_USD } from '@/lib/geo';
import '../home/index-legacy.css';
import './catalogo-legacy.css';

export type Psicologo = {
  id: number;
  nombre: string;
  especialidad: string;
  imagen_url: string | null;
  rating: string | number;
  problemas_principales: string[] | null;
  biografia: string | null;
  precio_terapia_individual: number | null;
  precio_terapia_individual_usd: number | null;
  precio_terapia_pareja?: number | null;
  precio_terapia_pareja_usd?: number | null;
  precio_asesoria_crianza?: number | null;
  precio_asesoria_crianza_usd?: number | null;
  servicios: string[] | null;
  cedula?: string | null;
  pais_origen?: string | null;
};

type RegionState = {
  currency: string;
  amount: number;
  inMexico?: boolean;
  regionUnknown?: boolean;
};

function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0307/g, '')
    .replace(/[\u0300-\u036f]/g, '');
}

function matchCorriente(corriente: string, especialidades: string[]) {
  const nCorriente = corriente.trim();
  if (!nCorriente) return '';
  return (
    especialidades.find((e) => {
      const n = norm(e);
      if (nCorriente === 'TCC') {
        return n.includes('cognitivo') || n.includes('conductual') || n.includes('tcc');
      }
      if (nCorriente === 'Psicoanalisis') {
        return n.includes('psicoanalisis') || n.includes('psicodinamica');
      }
      if (nCorriente === 'Sistemica') return n.includes('sistemica');
      if (nCorriente === 'Humanista') return n.includes('humanista');
      return false;
    }) || ''
  );
}

function minPrice(p: Psicologo, currency: string) {
  return minSessionPrice(p, currency);
}

function normalizePsicologo(p: Psicologo): Psicologo {
  return {
    ...p,
    problemas_principales: asStringArray(p.problemas_principales),
    servicios: asStringArray(p.servicios),
  };
}

function FilterDropdown({
  id,
  label,
  placeholder,
  openId,
  setOpenId,
  children,
  bubbles,
}: {
  id: string;
  label: string;
  placeholder: string;
  openId: string | null;
  setOpenId: (v: string | null) => void;
  children: React.ReactNode;
  bubbles: string[];
}) {
  const abierto = openId === id;
  return (
    <div className={`filtro-grupo dropdown-filtro-wrap${abierto ? ' is-open' : ''}`}>
      <label className="filtro-label">{label}</label>
      <div className={`dropdown-filtro${abierto ? ' abierto' : ''}`}>
        <button
          type="button"
          className="dropdown-filtro-trigger"
          aria-expanded={abierto}
          aria-haspopup="listbox"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setOpenId(abierto ? null : id);
          }}
        >
          <span
            className={`dropdown-filtro-burbujas${bubbles.length ? ' has-selection' : ''}`}
          >
            {bubbles.length
              ? bubbles.map((b) => (
                  <span key={b} className="filtro-burbuja">
                    {b}
                  </span>
                ))
              : placeholder}
          </span>
          <span className="dropdown-filtro-flecha" aria-hidden>
            ▼
          </span>
        </button>
        <div
          className="dropdown-filtro-panel"
          role="listbox"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function PsicoCard({
  p,
  currency,
  onProfile,
  onBook,
  t,
}: {
  p: Psicologo;
  currency: string;
  onProfile: () => void;
  onBook: () => void;
  t: ReturnType<typeof useTranslations<'catalog'>>;
}) {
  const sinRegion = !currency;
  const problemas = (p.problemas_principales || []).slice(0, 5);
  const inicial = (p.nombre || '').charAt(0).toUpperCase() || '?';
  const precioDesde = minPrice(p, currency || 'MXN');

  return (
    <article className="psico-card-modern">
      <div className="psico-card-header">
        <div
          className="psico-card-avatar"
          style={
            p.imagen_url
              ? {
                  backgroundImage: `url('${p.imagen_url}')`,
                  backgroundColor: 'transparent',
                }
              : undefined
          }
        >
          {p.imagen_url ? null : inicial}
        </div>
        <div>
          <h3 className="psico-card-name">{p.nombre || '—'}</h3>
          <div className="psico-card-especialidad">{p.especialidad || ''}</div>
          <div className="psico-card-meta">
            {t('license')} {p.cedula || '—'} · {p.pais_origen || ''}
          </div>
        </div>
      </div>
      <div className="psico-card-body">
        <p className="psico-card-tags-label">{t('interventionAreas')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1rem' }}>
          {problemas.map((pr) => (
            <span key={pr} className="tag-problema">
              {pr}
            </span>
          ))}
        </div>
        <p className="psico-card-tags-label">{t('services')}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {(p.servicios || []).map((s) => (
            <span key={s} className="tag-servicio">
              {s}
            </span>
          ))}
        </div>
        <div className="psico-card-footer">
          <span className="psico-card-rating">⭐ {p.rating ?? '—'}</span>
          <span className="psico-card-precio">
            {sinRegion ? (
              t('selectRegionForPrices')
            ) : (
              <>
                {t('fromPrice')} ${precioDesde}{' '}
                <small>
                  {currency} {t('perSession')}
                </small>
              </>
            )}
          </span>
        </div>
        <div className="psico-card-actions">
          <button type="button" className="psico-card-btn psico-card-btn-outline" onClick={onProfile}>
            {t('viewProfile')}
          </button>
          <button type="button" className="psico-card-btn psico-card-btn-primary" onClick={onBook}>
            {t('book')}
          </button>
        </div>
      </div>
    </article>
  );
}

export function CatalogoClient() {
  const t = useTranslations('catalog');
  const searchParams = useSearchParams();

  const [list, setList] = useState<Psicologo[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [region, setRegion] = useState<RegionState>({ currency: '', amount: 0, regionUnknown: true });
  const [especialidad, setEspecialidad] = useState('');
  const [problemasSel, setProblemasSel] = useState<string[]>([]);
  const [serviciosSel, setServiciosSel] = useState<string[]>([]);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [agendarTarget, setAgendarTarget] = useState<Psicologo | null>(null);
  const [urlApplied, setUrlApplied] = useState(false);

  const loadPsicologos = useCallback(async (inMexico: boolean | null) => {
    const url =
      inMexico === null ? '/api/psicologos' : `/api/psicologos?inMexico=${inMexico ? 'true' : 'false'}`;
    const { data, error } = await fetchJsonArray<Psicologo>(url);
    setList(data.map(normalizePsicologo));
    setLoadError(error);
    return data.map(normalizePsicologo);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const precioRegion = await fetchPrecioRegionClient();
        if (precioRegion.regionUnknown) {
          setRegion({ currency: '', amount: 0, regionUnknown: true });
          await loadPsicologos(null);
        } else {
          setRegion({
            currency: precioRegion.currency || '',
            amount: precioRegion.amount ?? 0,
            inMexico: precioRegion.inMexico,
            regionUnknown: false,
          });
          await loadPsicologos(precioRegion.inMexico === true);
        }
      } catch {
        setRegion({ currency: '', amount: 0, regionUnknown: true });
        await loadPsicologos(null);
      }
    }
    init();
  }, [loadPsicologos]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target;
      if (target instanceof Element && target.closest('.dropdown-filtro-wrap')) return;
      setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (urlApplied || list.length === 0) return;

    const corriente = (searchParams.get('corriente') || '').trim();
    if (corriente) {
      const especialidades = [...new Set(list.map((p) => (p.especialidad || '').trim()).filter(Boolean))];
      const match = matchCorriente(corriente, especialidades);
      if (match) setEspecialidad(match);
    }

    const servicioParam = (searchParams.get('servicio') || '').trim();
    if (servicioParam) {
      const decoded = decodeURIComponent(servicioParam);
      const allServicios = [...new Set(list.flatMap((p) => p.servicios || []))];
      const matched = allServicios.filter((s) => {
        const ns = norm(s);
        const nd = norm(decoded);
        return s === decoded || ns.includes(nd) || nd.includes(ns);
      });
      if (matched.length) setServiciosSel(matched);
    }

    const verId = searchParams.get('ver');
    if (verId) {
      const id = parseInt(verId, 10);
      if (!Number.isNaN(id)) setProfileId(id);
    }

    setUrlApplied(true);
  }, [list, searchParams, urlApplied]);

  useEffect(() => {
    if (searchParams.get('pago') === 'exito') {
      window.alert(t('paymentSuccess'));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, t]);

  const especialidades = useMemo(
    () => [...new Set(list.map((p) => (p.especialidad || '').trim()).filter(Boolean))].sort(),
    [list],
  );

  const problemasOpts = useMemo(() => {
    const set = new Set<string>();
    list.forEach((p) => asStringArray(p.problemas_principales).forEach((x) => set.add(x)));
    return [...set].sort();
  }, [list]);

  const serviciosOpts = useMemo(() => {
    const set = new Set<string>();
    list.forEach((p) => asStringArray(p.servicios).forEach((x) => set.add(x)));
    return [...set].sort();
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((p) => {
      const probs = asStringArray(p.problemas_principales);
      const servs = asStringArray(p.servicios);
      if (especialidad && (p.especialidad || '').trim() !== especialidad) return false;
      if (problemasSel.length && !problemasSel.some((x) => probs.includes(x))) return false;
      if (serviciosSel.length && !serviciosSel.some((x) => servs.includes(x))) return false;
      return true;
    });
  }, [list, especialidad, problemasSel, serviciosSel]);

  function limpiarFiltros() {
    setEspecialidad('');
    setProblemasSel([]);
    setServiciosSel([]);
    setOpenDropdown(null);
  }

  async function selectRegion(inMexico: boolean) {
    setRegion({
      currency: inMexico ? 'MXN' : 'USD',
      amount: inMexico ? PRECIOS_DEFAULT_MXN.individual : PRECIOS_DEFAULT_USD.individual,
      inMexico,
      regionUnknown: false,
    });
    await loadPsicologos(inMexico);
  }

  const filtrosActivos = filtered.length !== list.length;

  return (
    <>
      <section className="catalogo-hero">
        <div className="catalogo-hero-content">
          <h1 className="catalogo-hero-title">
            {t('heroTitle')} <span className="text-gradient">{t('heroHighlight')}</span>
          </h1>
          <p className="catalogo-hero-subtitle">{t('heroSubtitle')}</p>
          <div className="catalogo-hero-stats">
            <span>✅ {t('statVerified')}</span>
            <span>🔒 {t('statPrivate')}</span>
            <span>⭐ {t('statReviews')}</span>
          </div>
          <div className="catalogo-hero-btn-wrap">
            <button
              type="button"
              className="modal-bienvenida-btn modal-bienvenida-btn-sec"
              style={{ fontSize: '0.95rem' }}
              onClick={() => setSurveyOpen(true)}
            >
              {t('helpMeChoose')}
            </button>
          </div>
        </div>
      </section>

      <section className="catalogo-section-wrap">
        <h2 className="catalogo-section-title">{t('sectionTitle')}</h2>
        <p className="catalogo-section-desc">{t('sectionDesc')}</p>

        {loadError ? (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {t('dbUnavailable')}
            <p className="mt-1 text-xs opacity-80">{loadError}</p>
          </div>
        ) : null}

        <div className="catalogo-filtros-modern">
          <div className="filtros-grid">
            <FilterDropdown
              id="especialidad"
              label={t('filterSpecialty')}
              placeholder={t('allSpecialties')}
              openId={openDropdown}
              setOpenId={setOpenDropdown}
              bubbles={especialidad ? [especialidad] : []}
            >
              <label className="filtro-opcion">
                <input
                  type="radio"
                  name="filtro-especialidad"
                  checked={!especialidad}
                  onChange={() => {
                    setEspecialidad('');
                    setOpenDropdown(null);
                  }}
                />
                <span className="filtro-opcion-texto">{t('allSpecialties')}</span>
              </label>
              {especialidades.map((esp) => (
                <label key={esp} className="filtro-opcion">
                  <input
                    type="radio"
                    name="filtro-especialidad"
                    checked={especialidad === esp}
                    onChange={() => {
                      setEspecialidad(esp);
                      setOpenDropdown(null);
                    }}
                  />
                  <span className="filtro-opcion-texto">{esp}</span>
                </label>
              ))}
            </FilterDropdown>

            <FilterDropdown
              id="problemas"
              label={t('filterAreas')}
              placeholder={t('chooseAreas')}
              openId={openDropdown}
              setOpenId={setOpenDropdown}
              bubbles={problemasSel}
            >
              {problemasOpts.length === 0 ? (
                <p className="filtro-panel-vacio">{t('noFilterOptions')}</p>
              ) : (
                problemasOpts.map((pr) => (
                  <label key={pr} className="filtro-opcion">
                    <input
                      type="checkbox"
                      checked={problemasSel.includes(pr)}
                      onChange={(e) => {
                        setProblemasSel((prev) =>
                          e.target.checked ? [...prev, pr] : prev.filter((x) => x !== pr),
                        );
                      }}
                    />
                    <span className="filtro-opcion-texto">{pr}</span>
                  </label>
                ))
              )}
            </FilterDropdown>

            <FilterDropdown
              id="servicios"
              label={t('filterServices')}
              placeholder={t('chooseServices')}
              openId={openDropdown}
              setOpenId={setOpenDropdown}
              bubbles={serviciosSel}
            >
              {serviciosOpts.length === 0 ? (
                <p className="filtro-panel-vacio">{t('noFilterOptions')}</p>
              ) : (
                serviciosOpts.map((s) => (
                  <label key={s} className="filtro-opcion">
                    <input
                      type="checkbox"
                      checked={serviciosSel.includes(s)}
                      onChange={(e) => {
                        setServiciosSel((prev) =>
                          e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                        );
                      }}
                    />
                    <span className="filtro-opcion-texto">{s}</span>
                  </label>
                ))
              )}
            </FilterDropdown>

            <div className="filtro-accion">
              <button
                type="button"
                className="btn-limpiar"
                onClick={limpiarFiltros}
                disabled={!especialidad && !problemasSel.length && !serviciosSel.length}
              >
                {t('clearFilters')}
              </button>
            </div>
          </div>

          {filtrosActivos ? (
            <p className="filtros-resultado">
              {t('filterResults', { shown: filtered.length, total: list.length })}
            </p>
          ) : null}
        </div>

        {region.regionUnknown ? (
          <div
            id="selector-region-wrap"
            style={{
              margin: '1rem 0',
              padding: '1rem',
              background: '#fdf2f7',
              border: '1px solid var(--primario-rosa)',
              borderRadius: 12,
            }}
          >
            <p style={{ margin: '0 0 10px', fontWeight: 600, color: 'var(--texto-oscuro)' }}>
              {t('regionPrompt')}
            </p>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                style={{
                  padding: '10px 20px',
                  background: 'var(--primario-rosa)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => selectRegion(true)}
              >
                {t('regionMx')}
              </button>
              <button
                type="button"
                style={{
                  padding: '10px 20px',
                  background: '#2c3e50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                onClick={() => selectRegion(false)}
              >
                {t('regionIntl')}
              </button>
            </div>
          </div>
        ) : null}

        <div className="catalogo-grid-modern">
          {filtered.map((p) => (
            <PsicoCard
              key={p.id}
              p={p}
              currency={region.currency}
              t={t}
              onProfile={() => setProfileId(p.id)}
              onBook={() => setAgendarTarget(p)}
            />
          ))}
        </div>

        {filtered.length === 0 && !loadError ? (
          <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>{t('noResults')}</p>
        ) : null}
      </section>

      <CatalogoSurveyModal open={surveyOpen} onClose={() => setSurveyOpen(false)} />

      <PerfilPsicologoModal
        psicologoId={profileId}
        onClose={() => setProfileId(null)}
        onAgendar={(p) => setAgendarTarget(p)}
      />

      <AgendarDialog
        psicologo={agendarTarget}
        open={!!agendarTarget}
        onOpenChange={(o) => !o && setAgendarTarget(null)}
        region={region}
      />
    </>
  );
}
