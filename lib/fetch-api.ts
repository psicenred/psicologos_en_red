export function apiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudo cargar la información. Intenta recargar la página.';
}

export async function fetchJsonArray<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data: T[]; error: string | null }> {
  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...init,
    });
    const body = await res.json();
    if (!res.ok) {
      const message =
        typeof body === 'object' && body && 'error' in body
          ? String((body as { error: unknown }).error)
          : `HTTP ${res.status}`;
      return { data: [], error: message };
    }
    if (!Array.isArray(body)) {
      return { data: [], error: 'invalid_response' };
    }
    return { data: body as T[], error: null };
  } catch {
    return { data: [], error: 'network' };
  }
}

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      ...init,
    });
    const body = await res.json();
    if (!res.ok) {
      const message =
        typeof body === 'object' && body && 'error' in body
          ? String((body as { error: unknown }).error)
          : `HTTP ${res.status}`;
      return { data: null, error: message };
    }
    return { data: body as T, error: null };
  } catch {
    return { data: null, error: 'network' };
  }
}

export async function fetchApiList<T>(url: string): Promise<T[]> {
  const { data, error } = await fetchJsonArray<T>(url);
  if (error) {
    throw new Error(
      error === 'network' ? 'Error de conexión con el servidor.' : error,
    );
  }
  return data;
}

export function networkErrorMessage(error: string | null): string {
  if (!error) return 'Error desconocido.';
  return error === 'network' ? 'Error de conexión con el servidor.' : error;
}
