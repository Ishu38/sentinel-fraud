const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
const u = (path) => `${API_BASE}${path}`;

async function jsonOrThrow(res) {
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('application/json')) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `expected JSON, got ${ct || 'unknown'} (${res.status}). Backend likely not deployed.${body.slice(0, 80) ? ' · ' + body.slice(0, 80) : ''}`,
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => fetch(u('/api/health')).then(jsonOrThrow),

  scoreTransaction: (payload) =>
    fetch(u('/api/transactions'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(jsonOrThrow),

  listAlerts: (status) =>
    fetch(u(`/api/alerts${status ? `?status=${status}` : ''}`)).then(jsonOrThrow),

  updateAlert: (id, patch) =>
    fetch(u(`/api/alerts/${id}`), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(jsonOrThrow),

  stats: () => fetch(u('/api/stats')).then(jsonOrThrow),

  listTransactions: (limit = 200) =>
    fetch(u(`/api/transactions?limit=${limit}`)).then(jsonOrThrow),

  listEntities: (status) =>
    fetch(u(`/api/entities${status ? `?status=${status}` : ''}`)).then(jsonOrThrow),

  patchEntity: (key, patch) =>
    fetch(u(`/api/entities/${encodeURIComponent(key)}`), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(jsonOrThrow),

  listEvents: (limit = 100) =>
    fetch(u(`/api/events?limit=${limit}`)).then(jsonOrThrow),
};

export function subscribeStream({ onTransaction, onEvent, onError }) {
  let es;
  let closed = false;
  let failureCount = 0;
  try {
    es = new EventSource(u('/api/stream'));
  } catch {
    return () => {};
  }
  if (onTransaction) es.addEventListener('transaction', (e) => onTransaction(JSON.parse(e.data)));
  if (onEvent) es.addEventListener('event', (e) => onEvent(JSON.parse(e.data)));
  es.onerror = (err) => {
    failureCount += 1;
    if (failureCount >= 2) {
      es.close();
      closed = true;
    }
    onError?.(err);
  };
  return () => {
    if (!closed) es.close();
  };
}
