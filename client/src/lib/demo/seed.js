import { scoreTransaction } from './engine.js';
import { addEvent, addTransaction, getState } from './store.js';

const PRODUCTS = ['W', 'C', 'R', 'H', 'S'];
const BRANDS = ['visa', 'mastercard', 'american express', 'discover'];
const TYPES = ['credit', 'debit'];
const EMAILS_CLEAN = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
const EMAILS_RISKY = ['protonmail.com', 'anonymous.com'];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rid = () => Math.floor(Math.random() * 90_000) + 10_000;

function backdated(secondsAgo) {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

function buildTx(opts = {}) {
  const isFraud = opts.fraud ?? Math.random() < 0.18;
  const amount = isFraud
    ? (Math.random() < 0.4 ? 5 + Math.random() * 20 : 1500 + Math.random() * 4000)
    : 8 + Math.random() * 480;
  return {
    TransactionID: opts.transactionId ?? Date.now() + Math.floor(Math.random() * 9999),
    TransactionAmt: Number(amount.toFixed(2)),
    ProductCD: rand(PRODUCTS),
    card1: opts.card1 ?? rid(),
    card4: rand(BRANDS),
    card6: rand(TYPES),
    P_emaildomain: isFraud && Math.random() < 0.55 ? rand(EMAILS_RISKY) : rand(EMAILS_CLEAN),
  };
}

let seeded = false;

export function seedIfEmpty() {
  if (seeded) return;
  const state = getState();
  if (state.transactions.length > 0) { seeded = true; return; }

  const COUNT = 60;
  for (let i = 0; i < COUNT; i++) {
    const ago = (COUNT - i) * 90 + Math.floor(Math.random() * 30);
    const result = scoreTransaction(buildTx());
    result.transaction.createdAt = backdated(ago);
    if (result.alert) result.alert.createdAt = backdated(ago);
  }

  // a couple of resolved alerts so the dashboard shows variety
  const someAlerts = state.alerts.slice(0, Math.min(3, state.alerts.length));
  if (someAlerts[0]) someAlerts[0].status = 'reviewed';
  if (someAlerts[1]) someAlerts[1].status = 'dismissed';

  addEvent({
    code: 'SYSTEM_BOOT',
    severity: 'info',
    message: 'Sentinel demo session initialised · synthetic data generator active',
  });

  seeded = true;
}

let ambientId = null;
export function startAmbientTraffic(rateMs = 9_000) {
  if (ambientId) return;
  ambientId = setInterval(() => {
    scoreTransaction(buildTx());
  }, rateMs);
}

export function stopAmbientTraffic() {
  if (ambientId) { clearInterval(ambientId); ambientId = null; }
}
