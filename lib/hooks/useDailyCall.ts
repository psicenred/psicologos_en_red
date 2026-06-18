'use client';

import { useCallback, useRef, useState } from 'react';

export type DailyRoomState = {
  url: string;
  token: string;
  citaId: number;
};

export function useDailyCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<DailyRoomState | null>(null);
  const [joiningCitaId, setJoiningCitaId] = useState<number | null>(null);
  const joinInFlightRef = useRef<Promise<boolean> | null>(null);
  const joinCitaRef = useRef<number | null>(null);

  const join = useCallback(
    async (
      citaId: number,
      rol: 'paciente' | 'psicologo',
      displayName?: string,
    ): Promise<boolean> => {
      if (joinInFlightRef.current && joinCitaRef.current === citaId) {
        return joinInFlightRef.current;
      }

      if (room?.citaId === citaId && room.url) {
        return true;
      }

      const run = (async () => {
        setLoading(true);
        setJoiningCitaId(citaId);
        setError(null);
        try {
          const res = await fetch('/api/daily-meeting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ citaId, rol, displayName }),
          });
          const data = (await res.json()) as {
            url?: string;
            token?: string;
            error?: string;
          };
          if (!res.ok || data.error || !data.url) {
            setError(data.error || 'No se pudo iniciar la videollamada');
            return false;
          }
          setRoom({ url: data.url, token: data.token || '', citaId });
          fetch(`/api/citas/${citaId}/registrar-entrada`, { method: 'POST' }).catch(
            () => undefined,
          );
          return true;
        } catch {
          setError('Error de conexión al iniciar video');
          return false;
        } finally {
          setLoading(false);
          setJoiningCitaId(null);
          joinInFlightRef.current = null;
          joinCitaRef.current = null;
        }
      })();

      joinInFlightRef.current = run;
      joinCitaRef.current = citaId;
      return run;
    },
    [room],
  );

  const leave = useCallback(() => {
    joinInFlightRef.current = null;
    joinCitaRef.current = null;
    setJoiningCitaId(null);
    setRoom(null);
    setError(null);
  }, []);

  return { join, leave, loading, error, room, joiningCitaId };
};
