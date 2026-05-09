const subscribers = { transaction: new Set(), event: new Set() };

const state = {
  transactions: [],
  alerts: [],
  entities: new Map(),
  events: [],
};

const MAX_TX = 500;
const MAX_EVENTS = 300;

let nextTxOid = 1;
let nextAlertOid = 1;
let nextEventOid = 1;

const oid = () => {
  const v = nextTxOid++;
  return `demo${Date.now().toString(16)}${v.toString(16).padStart(6, '0')}`;
};

const newAlertOid = () => `demoa${Date.now().toString(16)}${(nextAlertOid++).toString(16).padStart(6, '0')}`;
const newEventOid = () => `demoe${Date.now().toString(16)}${(nextEventOid++).toString(16).padStart(6, '0')}`;

export function getState() {
  return state;
}

export function subscribe(channel, handler) {
  subscribers[channel]?.add(handler);
  return () => subscribers[channel]?.delete(handler);
}

function emit(channel, payload) {
  for (const fn of subscribers[channel] ?? []) {
    try { fn(payload); } catch {}
  }
}

export function addTransaction(tx) {
  const doc = { ...tx, _id: oid(), createdAt: tx.createdAt ?? new Date().toISOString() };
  state.transactions.unshift(doc);
  if (state.transactions.length > MAX_TX) state.transactions.length = MAX_TX;
  emit('transaction', doc);
  return doc;
}

export function addAlert(a) {
  const doc = { ...a, _id: newAlertOid(), createdAt: a.createdAt ?? new Date().toISOString(), status: a.status ?? 'open' };
  state.alerts.unshift(doc);
  return doc;
}

export function updateAlert(id, patch) {
  const found = state.alerts.find((x) => x._id === id);
  if (!found) return null;
  Object.assign(found, patch, { updatedAt: new Date().toISOString() });
  return found;
}

export function upsertEntity(key, type, mutator) {
  let e = state.entities.get(key);
  if (!e) {
    e = {
      _id: oid(),
      key,
      type,
      txCount: 0,
      fraudCount: 0,
      blockCount: 0,
      riskScore: 0,
      status: 'clean',
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
    state.entities.set(key, e);
  }
  mutator(e);
  e.lastSeen = new Date().toISOString();
  if (e.txCount > 0) e.riskScore = e.fraudCount / e.txCount;
  return e;
}

export function patchEntity(key, patch) {
  const e = state.entities.get(key);
  if (!e) return null;
  Object.assign(e, patch);
  if (patch.status === 'blocked') {
    e.blockedAt = new Date().toISOString();
    e.blockReason = patch.blockReason ?? 'manual';
  }
  return e;
}

export function addEvent({ code, severity = 'info', message, transactionId, entityKey, meta }) {
  const doc = {
    _id: newEventOid(),
    code,
    severity,
    message,
    transactionId,
    entityKey,
    meta,
    createdAt: new Date().toISOString(),
  };
  state.events.unshift(doc);
  if (state.events.length > MAX_EVENTS) state.events.length = MAX_EVENTS;
  emit('event', doc);
  return doc;
}

export function listTransactions(limit = 50) {
  return state.transactions.slice(0, limit);
}

export function listAlerts(status) {
  const arr = status ? state.alerts.filter((a) => a.status === status) : state.alerts;
  return arr.slice(0, 200);
}

export function listEntities(status) {
  const arr = [...state.entities.values()];
  arr.sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return b.fraudCount - a.fraudCount;
  });
  return status ? arr.filter((e) => e.status === status) : arr;
}

export function entityCounts() {
  const counts = { clean: 0, watch: 0, blocked: 0 };
  for (const e of state.entities.values()) counts[e.status] = (counts[e.status] ?? 0) + 1;
  return counts;
}

export function listEvents(limit = 100) {
  return state.events.slice(0, limit);
}

export function getStats() {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const recent = state.transactions.filter((t) => +new Date(t.createdAt) >= since);
  const flagged = recent.filter((t) => t?.score?.isFraud);
  const verdicts = { ALLOW: 0, CHALLENGE: 0, REVIEW: 0, BLOCK: 0 };
  for (const t of recent) {
    const v = t?.decision?.verdict;
    if (v && verdicts[v] != null) verdicts[v]++;
  }
  const lastFlagged = flagged[0]?.createdAt ?? null;
  const counts = entityCounts();
  const critical = state.events.filter((e) => +new Date(e.createdAt) >= since && (e.severity === 'critical' || e.severity === 'alert')).length;

  return {
    windowHours: 24,
    scored: recent.length,
    flagged: flagged.length,
    flagRate: recent.length ? flagged.length / recent.length : 0,
    openAlerts: state.alerts.filter((a) => a.status === 'open').length,
    lastFlaggedAt: lastFlagged,
    verdicts,
    entities: { blocked: counts.blocked, watch: counts.watch },
    criticalEvents: critical,
  };
}

export function getHealth() {
  return {
    status: 'ok',
    engine: { ok: true, status: 'ok', model_loaded: true, mode: 'demo' },
  };
}
