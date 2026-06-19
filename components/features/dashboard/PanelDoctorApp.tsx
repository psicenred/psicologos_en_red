'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DoctorShell } from '@/components/features/doctor/DoctorShell';
import {
  DoctorChatSection,
  DoctorDashboardSection,
  DoctorNotasModal,
  DoctorPacientesSection,
  DoctorVideoSection,
} from '@/components/features/doctor/DoctorPanelSections';
import { DoctorAgendaSection, DoctorDocumentosSection } from '@/components/features/doctor/DoctorSections';
import { type CitaDoctor } from '@/components/features/doctor/doctor-helpers';
import { mensajesNoLeidosAction } from '@/lib/chat/actions';
import { fetchApiList, networkErrorMessage } from '@/lib/fetch-api';
import { useDailyCall } from '@/lib/hooks/useDailyCall';

export function PanelDoctorApp() {
  const qc = useQueryClient();
  const [section, setSection] = useState('dashboard');
  const [citaVideo, setCitaVideo] = useState<CitaDoctor | null>(null);
  const [citaNotas, setCitaNotas] = useState<CitaDoctor | null>(null);
  const [tituloVideo, setTituloVideo] = useState('Sala de Espera');
  const daily = useDailyCall();
  const { join, leave, room, error, joiningCitaId } = daily;

  const { data: user } = useQuery({
    queryKey: ['user-data'],
    queryFn: async () => {
      const res = await fetch('/api/user-data');
      return res.ok ? res.json() : null;
    },
  });

  const { data: citas = [], refetch: refetchCitas } = useQuery({
    queryKey: ['mis-citas-doctor'],
    queryFn: async () => {
      const res = await fetch('/api/mis-citas-doctor');
      return res.ok ? res.json() : [];
    },
  });

  const {
    data: pacientes = [],
    isLoading: loadingPacientes,
    isError: pacientesError,
    error: pacientesLoadError,
  } = useQuery({
    queryKey: ['doctor-pacientes'],
    queryFn: () => fetchApiList<{ id: number; nombre: string }>('/api/doctor/pacientes'),
  });

  const { data: unread = { count: 0 } } = useQuery({
    queryKey: ['mensajes-no-leidos'],
    queryFn: async () => {
      const result = await mensajesNoLeidosAction();
      return result.ok ? result.data : { count: 0 };
    },
    refetchInterval: 30_000,
  });

  const { data: videoConfig = { activar15MinAntes: true } } = useQuery({
    queryKey: ['video-boton-15min'],
    queryFn: async () => {
      const res = await fetch('/api/config/video-boton-15min');
      return res.ok ? res.json() : { activar15MinAntes: true };
    },
  });

  const { data: zonaPsi } = useQuery({
    queryKey: ['mi-zona-horaria'],
    queryFn: async () => {
      const res = await fetch('/api/mi-zona-horaria');
      return res.ok ? res.json() : { zona_horaria: 'America/Mexico_City' };
    },
  });

  const zonaVisualizacion =
    (zonaPsi as { zona_horaria?: string } | undefined)?.zona_horaria ||
    (citas[0] as CitaDoctor | undefined)?.zona_horaria_psicologo ||
    'America/Mexico_City';

  const chatContactos = useMemo(
    () =>
      pacientes.map((p: { id: number; nombre: string }) => ({
        id: p.id,
        nombre: p.nombre,
      })),
    [pacientes],
  );

  const iniciarVideo = useCallback(
    async (cita: CitaDoctor) => {
      setCitaVideo(cita);
      setTituloVideo(`Sesión con ${cita.paciente_nombre || 'paciente'}`);
      const ok = await join(cita.cita_id, 'psicologo', user?.nombre);
      if (ok) setSection('video');
    },
    [join, user?.nombre],
  );

  const salirVideo = useCallback(() => {
    leave();
    setTituloVideo('Sala de Espera');
  }, [leave]);

  function abrirNotas(cita: CitaDoctor) {
    if (section === 'video' || citaVideo?.cita_id === cita.cita_id) {
      setCitaVideo(cita);
      setSection('video');
      return;
    }
    setCitaNotas(cita);
  }

  return (
    <DoctorShell
      section={section}
      onSectionChange={setSection}
      nombre={user?.nombre || 'Especialista'}
      unreadCount={unread.count}
    >
      {section === 'dashboard' && (
        <DoctorDashboardSection
          citas={citas as CitaDoctor[]}
          video15Min={videoConfig.activar15MinAntes !== false}
          onVideo={iniciarVideo}
          onNotas={abrirNotas}
          joiningCitaId={joiningCitaId}
          zonaVisualizacion={zonaVisualizacion}
        />
      )}

      {section === 'chat' && (
        <DoctorChatSection
          contactos={chatContactos}
          contactosLoading={loadingPacientes}
          contactosError={
            pacientesError ? networkErrorMessage(String(pacientesLoadError)) : null
          }
        />
      )}

      {section === 'video' && (
        <DoctorVideoSection
          titulo={tituloVideo}
          room={room ? { url: room.url, token: room.token } : null}
          error={error}
          citaSeleccionada={citaVideo}
          onLeave={salirVideo}
          onNotasSaved={() => refetchCitas()}
        />
      )}

      {section === 'pacientes' && (
        <DoctorPacientesSection pacientes={pacientes as Record<string, unknown>[]} />
      )}

      {section === 'documentos' && <DoctorDocumentosSection />}

      {section === 'agenda' && <DoctorAgendaSection />}

      {citaNotas ? (
        <DoctorNotasModal
          cita={citaNotas}
          onClose={() => setCitaNotas(null)}
          onSaved={() => {
            refetchCitas();
            qc.invalidateQueries({ queryKey: ['mis-citas-doctor'] });
          }}
        />
      ) : null}
    </DoctorShell>
  );
}
