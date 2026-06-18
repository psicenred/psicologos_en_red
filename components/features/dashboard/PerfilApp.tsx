'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PerfilShell } from '@/components/features/perfil/PerfilShell';
import {
  PerfilCitasSection,
  PerfilChatSection,
  PerfilConfigSection,
  PerfilDashboardSection,
  PerfilVideoSection,
} from '@/components/features/perfil/PerfilSections';
import { type CitaPaciente } from '@/components/features/perfil/perfil-helpers';
import { fetchApiList, networkErrorMessage } from '@/lib/fetch-api';
import { useDailyCall } from '@/lib/hooks/useDailyCall';

type User = {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  contacto_emergencia: string | null;
};

type ContactoRaw = { id: number; nombre: string; usuario_id: number };

export function PerfilApp() {
  const qc = useQueryClient();
  const [section, setSection] = useState('dashboard');
  const [infoSesion, setInfoSesion] = useState('Conéctate a tu sesión programada.');
  const daily = useDailyCall();
  const { join, leave, room, error, joiningCitaId } = daily;

  const { data: user, refetch: refetchUser } = useQuery({
    queryKey: ['user-data'],
    queryFn: async () => {
      const res = await fetch('/api/user-data');
      return res.ok ? (res.json() as Promise<User>) : null;
    },
  });

  const { data: citas = [], refetch: refetchCitas } = useQuery({
    queryKey: ['mis-citas-paciente'],
    queryFn: async () => {
      const res = await fetch('/api/mis-citas-paciente');
      return res.ok ? res.json() : [];
    },
  });

  const { data: unread = { count: 0 } } = useQuery({
    queryKey: ['mensajes-no-leidos'],
    queryFn: async () => {
      const res = await fetch('/api/mensajes-no-leidos');
      return res.ok ? res.json() : { count: 0 };
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

  const contactos = useQuery({
    queryKey: ['mis-psicologos-contacto'],
    queryFn: async () => {
      const rows = await fetchApiList<ContactoRaw>('/api/mis-psicologos-contacto');
      return rows
        .map((r) => ({ id: Number(r.usuario_id), nombre: r.nombre }))
        .filter((c) => Number.isFinite(c.id) && c.id > 0);
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pago') === 'exito') {
      refetchCitas();
      setSection('citas');
    }
  }, [refetchCitas]);

  const iniciarVideo = useCallback(
    async (cita: CitaPaciente) => {
      setInfoSesion(`Sesión con: ${cita.psicologo_nombre || 'tu especialista'}`);
      const ok = await join(cita.id, 'paciente', user?.nombre);
      if (ok) setSection('video');
    },
    [join, user?.nombre],
  );

  const salirVideo = useCallback(() => {
    leave();
    setInfoSesion('Conéctate a tu sesión programada.');
  }, [leave]);

  return (
    <PerfilShell
      section={section}
      onSectionChange={setSection}
      nombre={user?.nombre || 'Usuario'}
      unreadCount={unread.count}
    >
      {section === 'dashboard' && (
        <PerfilDashboardSection
          nombre={user?.nombre || ''}
          citas={citas as CitaPaciente[]}
          onVerCitas={() => setSection('citas')}
        />
      )}

      {section === 'citas' && (
        <PerfilCitasSection
          citas={citas as CitaPaciente[]}
          video15Min={videoConfig.activar15MinAntes !== false}
          onVideo={iniciarVideo}
          onRefetch={refetchCitas}
          joiningCitaId={joiningCitaId}
        />
      )}

      {section === 'video' && (
        <PerfilVideoSection
          infoSesion={infoSesion}
          room={room ? { url: room.url, token: room.token } : null}
          error={error}
          onLeave={salirVideo}
        />
      )}

      {section === 'chat' && (
        <PerfilChatSection
          contactos={contactos.data || []}
          contactosLoading={contactos.isLoading}
          contactosError={
            contactos.isError ? networkErrorMessage(String(contactos.error)) : null
          }
        />
      )}

      {section === 'config' && user ? (
        <PerfilConfigSection
          user={user}
          onSaved={() => {
            refetchUser();
            qc.invalidateQueries({ queryKey: ['user-data'] });
          }}
        />
      ) : null}
    </PerfilShell>
  );
}
