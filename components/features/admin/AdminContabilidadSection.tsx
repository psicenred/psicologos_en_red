'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatFecha, formatHora } from '@/components/features/admin/admin-helpers';
import {
  formatMxn,
  formatPct,
  type ContabilidadLinea,
  type ContabilidadPeriodo,
  type ContabilidadResponse,
} from '@/lib/admin/contabilidad-types';

const PERIODOS: { id: ContabilidadPeriodo; label: string }[] = [
  { id: 'quincena', label: 'Quincena actual' },
  { id: 'mes', label: 'Mes actual' },
  { id: 'historico', label: 'Histórico' },
];

function buildQueryString(params: Record<string, string | boolean | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === '' || v === false) return;
    sp.set(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

async function fetchContabilidad(qs: string): Promise<ContabilidadResponse> {
  const res = await fetch(`/api/admin/contabilidad${qs}`, { credentials: 'include' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<ContabilidadResponse>;
}

function fuenteLabel(fuente: ContabilidadLinea['costo_fuente']): string {
  if (fuente === 'monto_final' || fuente === 'monto_original') return 'Cobrado';
  if (fuente === 'tarifa_usd') return 'Tarifa USD→MXN';
  return 'Tarifa psicólogo';
}

export function AdminContabilidadSection() {
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState<ContabilidadPeriodo>('mes');
  const [fechaCitaDesde, setFechaCitaDesde] = useState('');
  const [fechaCitaHasta, setFechaCitaHasta] = useState('');
  const [fechaPagoDesde, setFechaPagoDesde] = useState('');
  const [fechaPagoHasta, setFechaPagoHasta] = useState('');
  const [psicologoId, setPsicologoId] = useState('');
  const [incluirPrueba, setIncluirPrueba] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const queryKey = useMemo(
    () => [
      'admin-contabilidad',
      periodo,
      fechaCitaDesde,
      fechaCitaHasta,
      fechaPagoDesde,
      fechaPagoHasta,
      psicologoId,
      incluirPrueba,
    ],
    [
      periodo,
      fechaCitaDesde,
      fechaCitaHasta,
      fechaPagoDesde,
      fechaPagoHasta,
      psicologoId,
      incluirPrueba,
    ],
  );

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey,
    queryFn: () =>
      fetchContabilidad(
        buildQueryString({
          periodo,
          fecha_cita_desde: fechaCitaDesde || undefined,
          fecha_cita_hasta: fechaCitaHasta || undefined,
          fecha_pago_desde: fechaPagoDesde || undefined,
          fecha_pago_hasta: fechaPagoHasta || undefined,
          psicologo_id: psicologoId || undefined,
          incluir_prueba: incluirPrueba || undefined,
        }),
      ),
  });

  const { data: psicologosList = [] } = useQuery({
    queryKey: ['admin-psicologos-contabilidad'],
    queryFn: async () => {
      const res = await fetch('/api/admin/psicologos', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json() as Promise<{ id: number; nombre: string }[]>;
    },
  });

  const togglePrueba = useCallback(
    async (linea: ContabilidadLinea) => {
      setTogglingId(linea.id);
      try {
        const res = await fetch(`/api/admin/contabilidad/${linea.id}/prueba`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ es_prueba: !linea.es_prueba }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? 'No se pudo actualizar');
        }
        await queryClient.invalidateQueries({ queryKey: ['admin-contabilidad'] });
      } catch (e) {
        alert((e as Error).message);
      } finally {
        setTogglingId(null);
      }
    },
    [queryClient],
  );

  const totales = data?.totales;
  const lineas = data?.lineas ?? [];

  return (
    <section id="contabilidad" className="admin-section active">
      <div className="contabilidad-periodo-tabs">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`contabilidad-tab${periodo === p.id ? ' active' : ''}`}
            onClick={() => {
              setPeriodo(p.id);
              setFechaCitaDesde('');
              setFechaCitaHasta('');
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon azul">💰</div>
          <div className="stat-info">
            <h3>{totales ? formatMxn(totales.costo_total) : '—'}</h3>
            <p>Ingresos (costo sesión)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon verde">👨‍⚕️</div>
          <div className="stat-info">
            <h3>{totales ? formatMxn(totales.comision_neta_total) : '—'}</h3>
            <p>Comisión neta psicólogos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon rosa">🏛️</div>
          <div className="stat-info">
            <h3>{totales ? formatMxn(totales.iva_reservado_total) : '—'}</h3>
            <p>IVA reservado (SAT)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon azul">📈</div>
          <div className="stat-info">
            <h3>{totales ? formatMxn(totales.ganancia_plataforma_total) : '—'}</h3>
            <p>Ganancia plataforma</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon rosa">💳</div>
          <div className="stat-info">
            <h3>{totales ? formatMxn(totales.stripe_fee_total) : '—'}</h3>
            <p>Fee Stripe (5%)</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon verde">📅</div>
          <div className="stat-info">
            <h3>{totales?.citas ?? '—'}</h3>
            <p>Citas realizadas</p>
          </div>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="admin-table-header">
          <h2>Filtros</h2>
          {isFetching && !isLoading ? (
            <span style={{ color: '#888', fontSize: '0.85rem' }}>Actualizando…</span>
          ) : null}
        </div>
        <div className="filtros-citas">
          <div className="filtro-grupo">
            <label>Fecha cita desde</label>
            <input
              type="date"
              value={fechaCitaDesde}
              onChange={(e) => setFechaCitaDesde(e.target.value)}
            />
          </div>
          <div className="filtro-grupo">
            <label>Fecha cita hasta</label>
            <input
              type="date"
              value={fechaCitaHasta}
              onChange={(e) => setFechaCitaHasta(e.target.value)}
            />
          </div>
          <div className="filtro-grupo">
            <label>Fecha pago desde</label>
            <input
              type="date"
              value={fechaPagoDesde}
              onChange={(e) => setFechaPagoDesde(e.target.value)}
            />
          </div>
          <div className="filtro-grupo">
            <label>Fecha pago hasta</label>
            <input
              type="date"
              value={fechaPagoHasta}
              onChange={(e) => setFechaPagoHasta(e.target.value)}
            />
          </div>
          <div className="filtro-grupo">
            <label>Psicólogo</label>
            <select value={psicologoId} onChange={(e) => setPsicologoId(e.target.value)}>
              <option value="">Todos</option>
              {psicologosList.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="filtro-grupo" style={{ alignSelf: 'flex-end' }}>
            <label className="contabilidad-check">
              <input
                type="checkbox"
                checked={incluirPrueba}
                onChange={(e) => setIncluirPrueba(e.target.checked)}
              />
              Incluir citas de prueba
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#888' }}>Cargando contabilidad…</p>
      ) : error ? (
        <p style={{ color: '#c0392b' }}>{(error as Error).message}</p>
      ) : (
        <>
          <div className="admin-table-container">
            <div className="admin-table-header">
              <h2>Resumen por psicólogo</h2>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Psicólogo</th>
                  <th style={{ textAlign: 'center' }}>Citas</th>
                  <th style={{ textAlign: 'right' }}>Ingresos</th>
                  <th style={{ textAlign: 'right' }}>Comisión neta</th>
                  <th style={{ textAlign: 'right' }}>IVA reservado</th>
                  <th style={{ textAlign: 'right' }}>Stripe 5%</th>
                  <th style={{ textAlign: 'right' }}>Ganancia plataforma</th>
                </tr>
              </thead>
              <tbody>
                {(data?.por_psicologo ?? []).map((p) => (
                  <tr key={p.psicologo_id}>
                    <td>{p.psicologo_nombre}</td>
                    <td style={{ textAlign: 'center' }}>{p.citas}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(p.costo_total)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(p.comision_neta_total)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(p.iva_reservado_total)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(p.stripe_fee_total)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(p.ganancia_plataforma_total)}</td>
                  </tr>
                ))}
                {(data?.por_psicologo.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: '#888' }}>
                      Sin citas en este período
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="admin-table-container">
            <div className="admin-table-header">
              <h2>Detalle por cita</h2>
              <span style={{ color: '#888', fontSize: '0.85rem' }}>
                Tramo por paciente+psicólogo · 1–10 = 65%, 11+ = 70%
              </span>
            </div>
            <table className="contabilidad-detalle-table">
              <thead>
                <tr>
                  <th>Fecha cita</th>
                  <th>Fecha pago</th>
                  <th>Paciente</th>
                  <th>Psicólogo</th>
                  <th># cita</th>
                  <th>%</th>
                  <th style={{ textAlign: 'right' }}>Costo</th>
                  <th style={{ textAlign: 'right' }}>Base s/IVA</th>
                  <th style={{ textAlign: 'right' }}>Com. bruta</th>
                  <th style={{ textAlign: 'right' }}>ISR</th>
                  <th style={{ textAlign: 'right' }}>Com. neta</th>
                  <th style={{ textAlign: 'right' }}>Gan. plataforma</th>
                  <th>Fuente</th>
                  <th>Prueba</th>
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.id} className={l.es_prueba ? 'contabilidad-row-prueba' : undefined}>
                    <td>
                      {formatFecha(l.fecha)} {formatHora(l.hora)}
                    </td>
                    <td>{l.fecha_pago ? formatFecha(l.fecha_pago) : '—'}</td>
                    <td>{l.paciente_nombre}</td>
                    <td>{l.psicologo_nombre}</td>
                    <td style={{ textAlign: 'center' }}>{l.numero_cita_paciente}</td>
                    <td style={{ textAlign: 'center' }}>{formatPct(l.pct_comision)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(l.costo_sesion)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(l.base_sin_iva)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(l.comision_bruta)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(l.isr_retenido)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(l.comision_neta)}</td>
                    <td style={{ textAlign: 'right' }}>{formatMxn(l.ganancia_plataforma)}</td>
                    <td>{fuenteLabel(l.costo_fuente)}</td>
                    <td>
                      <button
                        type="button"
                        className={`contabilidad-prueba-btn${l.es_prueba ? ' is-prueba' : ''}`}
                        disabled={togglingId === l.id}
                        onClick={() => togglePrueba(l)}
                        title={l.es_prueba ? 'Marcar como real' : 'Marcar como prueba'}
                      >
                        {togglingId === l.id ? '…' : l.es_prueba ? 'Prueba' : 'Real'}
                      </button>
                    </td>
                  </tr>
                ))}
                {lineas.length === 0 ? (
                  <tr>
                    <td colSpan={14} style={{ textAlign: 'center', color: '#888' }}>
                      Sin citas realizadas en este período
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
