import { scoreTransaction as demoScore } from './demo/engine.js';
import { seedIfEmpty, startAmbientTraffic } from './demo/seed.js';
import {
  entityCounts,
  getHealth,
  getStats,
  listAlerts,
  listEntities,
  listEvents,
  listTransactions,
  patchEntity,
  subscribe as demoSubscribe,
  updateAlert as demoUpdateAlert,
} from './demo/store.js';

const API_BASE_RAW = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
export const DEMO_MODE = !API_BASE_RAW || import.meta.env.VITE_DEMO_MODE === 'true';

if (DEMO_MODE) {
  seedIfEmpty();
  startAmbientTraffic(11_000);
}

const API_BASE = API_BASE_RAW;
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const live = {
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

const demo = {
  health: async () => { await wait(40); return getHealth(); },

  scoreTransaction: async (payload) => { await wait(80 + Math.random() * 60); return demoScore(payload); },

  listAlerts: async (status) => { await wait(30); return { items: listAlerts(status) }; },

  updateAlert: async (id, patch) => { await wait(40); return demoUpdateAlert(id, patch) ?? { error: 'not_found' }; },

  stats: async () => { await wait(30); return getStats(); },

  listTransactions: async (limit = 200) => { await wait(30); return { items: listTransactions(limit) }; },

  listEntities: async (status) => {
    await wait(30);
    return { items: listEntities(status), counts: entityCounts() };
  },

  patchEntity: async (key, patch) => { await wait(40); return patchEntity(key, patch) ?? { error: 'not_found' }; },

  listEvents: async (limit = 100) => { await wait(30); return { items: listEvents(limit) }; },
};

export const api = DEMO_MODE ? demo : live;

export function subscribeStream({ onTransaction, onEvent, onError }) {
  if (DEMO_MODE) {
    const unsubTx = onTransaction ? demoSubscribe('transaction', onTransaction) : () => {};
    const unsubEv = onEvent ? demoSubscribe('event', onEvent) : () => {};
    return () => { unsubTx(); unsubEv(); };
  }

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
    if (failureCount >= 2) { es.close(); closed = true; }
    onError?.(err);
  };
  return () => { if (!closed) es.close(); };
}
