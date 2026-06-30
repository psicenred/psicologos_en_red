export function estadoBadgeClass(estado: string): string {
  const e = (estado || '').toLowerCase();
  if (e === 'confirmada') return 'badge-confirmada';
  if (e === 'pendiente') return 'badge-pendiente';
  if (e === 'cancelada') return 'badge-cancelada';
  if (e === 'realizada') return 'badge-realizada';
  if (e === 'no realizada') return 'badge-no-realizada';
  return 'badge-pendiente';
}

export function formatFecha(fecha: string | Date | null | undefined): string {
  if (fecha == null || fecha === '') return '—';

  if (fecha instanceof Date) {
    if (Number.isNaN(fecha.getTime())) return '—';
    const y = fecha.getUTCFullYear();
    const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const d = String(fecha.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(fecha).trim();
  const isoDate = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDate) return isoDate[1];

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
    const d = String(parsed.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return s.slice(0, 10);
}

export function formatHora(hora: string | null | undefined): string {
  if (!hora) return '—';
  return String(hora).slice(0, 5);
}

export function diasSinCita(
  ultimaCita: string | null | undefined,
  citasFuturas: number | string | null | undefined,
): string {
  const futuras = parseInt(String(citasFuturas ?? 0), 10) || 0;
  if (futuras > 0) return '0';
  if (!ultimaCita) return '—';
  const ultima = new Date(String(ultimaCita).slice(0, 10));
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  ultima.setHours(0, 0, 0, 0);
  const diff = Math.floor((hoy.getTime() - ultima.getTime()) / (1000 * 60 * 60 * 24));
  return String(Math.max(0, diff));
}

export type CarteraItem = {
  id: number;
  nombre: string;
  con_cita: number;
  en_seguimiento: number;
  en_riesgo: number;
};

export function CarteraChart({ items }: { items: CarteraItem[] }) {
  if (!items.length) {
    return <p style={{ textAlign: 'center', color: '#888' }}>No hay datos disponibles</p>;
  }

  return (
    <div className="cartera-chart">
      {items.map((psi) => {
        const conCita = psi.con_cita || 0;
        const enSeguimiento = psi.en_seguimiento || 0;
        const enRiesgo = psi.en_riesgo || 0;
        const total = conCita + enSeguimiento + enRiesgo;

        if (total === 0) {
          return (
            <div key={psi.id} className="cartera-row">
              <div className="cartera-nombre" title={psi.nombre}>
                {psi.nombre}
              </div>
              <div className="cartera-bar-empty">Sin pacientes</div>
              <div className="cartera-total">0</div>
            </div>
          );
        }

        const pctConCita = (conCita / total) * 100;
        const pctSeguimiento = (enSeguimiento / total) * 100;
        const pctRiesgo = (enRiesgo / total) * 100;

        return (
          <div key={psi.id} className="cartera-row">
            <div className="cartera-nombre" title={psi.nombre}>
              {psi.nombre}
            </div>
            <div className="cartera-bar-wrap">
              {conCita > 0 ? (
                <div
                  style={{
                    width: `${pctConCita}%`,
                    background: '#27ae60',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                  title={`Con cita: ${conCita}`}
                >
                  {pctConCita > 10 ? conCita : ''}
                </div>
              ) : null}
              {enSeguimiento > 0 ? (
                <div
                  style={{
                    width: `${pctSeguimiento}%`,
                    background: '#f1c40f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#333',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                  title={`En seguimiento: ${enSeguimiento}`}
                >
                  {pctSeguimiento > 10 ? enSeguimiento : ''}
                </div>
              ) : null}
              {enRiesgo > 0 ? (
                <div
                  style={{
                    width: `${pctRiesgo}%`,
                    background: '#e74c3c',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                  title={`En riesgo: ${enRiesgo}`}
                >
                  {pctRiesgo > 10 ? enRiesgo : ''}
                </div>
              ) : null}
            </div>
            <div className="cartera-total">{total} pac.</div>
          </div>
        );
      })}
    </div>
  );
}
