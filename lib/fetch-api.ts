export async function fetchJsonArray<T>(
  url: string,
): Promise<{ data: T[]; error: string | null }> {
  try {
    const res = await fetch(url);
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
