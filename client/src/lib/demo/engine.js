import {
  addAlert,
  addEvent,
  addTransaction,
  getState,
  upsertEntity,
} from './store.js';

const RISKY_EMAIL = new Set(['protonmail.com', 'anonymous.com', 'mail.com', 'tutanota.com']);
const ML_BLOCK = 0.85;
const ML_REVIEW = 0.70;
const ML_CHALLENGE = 0.50;
const VELOCITY_WINDOW_MS = 60_000;
const VELOCITY_LIMIT = 5;
const FRAUD_HITS_TO_BLOCK = 3;

function entityKeysFor(payload) {
  const keys = [];
  if (payload?.card1 != null) keys.push({ key: `card:${payload.card1}`, type: 'card' });
  if (payload?.P_emaildomain) keys.push({ key: `email:${payload.P_emaildomain}`, type: 'email' });
  return keys;
}

function heuristicProbability(payload, recentVelocity) {
  let p = 0.04;
  const amt = payload.TransactionAmt ?? 0;
  if (amt > 5000) p += 0.40;
  else if (amt > 2000) p += 0.22;
  else if (amt > 800) p += 0.10;
  else if (amt < 5) p += 0.18;

  if (RISKY_EMAIL.has(payload.P_emaildomain)) p += 0.32;
  if (payload.R_emaildomain && payload.R_emaildomain !== payload.P_emaildomain && amt > 1000) p += 0.10;
  if (recentVelocity >= 5) p += 0.30;
  else if (recentVelocity >= 3) p += 0.15;

  if (payload.ProductCD === 'C') p += 0.05;
  if (payload.card6 === 'credit' && amt > 2000) p += 0.05;

  p += (Math.random() - 0.5) * 0.08;
  return Math.max(0.001, Math.min(0.999, p));
}

function evaluateRules(payload) {
  const reasons = [];
  let block = false;
  let challenge = false;

  const state = getState();
  const blocked = entityKeysFor(payload).some((k) => state.entities.get(k.key)?.status === 'blocked');
  if (blocked) {
    block = true;
    for (const k of entityKeysFor(payload)) {
      const e = state.entities.get(k.key);
      if (e?.status === 'blocked') reasons.push({ code: 'BLOCKLIST_HIT', detail: k.key });
    }
  }

  let velocity = 0;
  if (payload.card1 != null) {
    const since = Date.now() - VELOCITY_WINDOW_MS;
    velocity = state.transactions.filter(
      (t) => t?.payload?.card1 === payload.card1 && +new Date(t.createdAt) >= since,
    ).length;
    if (velocity >= VELOCITY_LIMIT) {
      block = true;
      reasons.push({ code: 'VELOCITY_BURST', detail: `${velocity + 1} tx · 60s window` });
    } else if (velocity >= 3) {
      challenge = true;
      reasons.push({ code: 'VELOCITY_ELEVATED', detail: `${velocity + 1} tx · 60s window` });
    }
  }

  if (RISKY_EMAIL.has(payload.P_emaildomain)) {
    challenge = true;
    reasons.push({ code: 'EMAIL_LOW_REPUTATION', detail: payload.P_emaildomain });
  }

  if (
    payload.R_emaildomain &&
    payload.P_emaildomain &&
    payload.R_emaildomain !== payload.P_emaildomain &&
    (payload.TransactionAmt ?? 0) > 1000
  ) {
    challenge = true;
    reasons.push({
      code: 'CROSS_DOMAIN_HIGH_VALUE',
      detail: `${payload.P_emaildomain} → ${payload.R_emaildomain} @ $${payload.TransactionAmt}`,
    });
  }

  if ((payload.TransactionAmt ?? 0) > 5000) {
    challenge = true;
    reasons.push({ code: 'AMOUNT_OUTLIER', detail: `$${payload.TransactionAmt} > $5,000` });
  }

  return { block, challenge, reasons, velocity };
}

function decide({ p, rules }) {
  const reasons = [...rules.reasons];
  if (rules.block) {
    reasons.push({ code: 'RULE_BLOCK', detail: 'rules required block' });
    return { verdict: 'BLOCK', reasons };
  }
  if (p >= ML_BLOCK) {
    reasons.push({ code: 'ML_CRITICAL', detail: `p=${p.toFixed(4)} ≥ ${ML_BLOCK}` });
    return { verdict: 'BLOCK', reasons };
  }
  if (p >= ML_REVIEW) {
    reasons.push({ code: 'ML_HIGH', detail: `p=${p.toFixed(4)} ≥ ${ML_REVIEW}` });
    return { verdict: 'REVIEW', reasons };
  }
  if (p >= ML_CHALLENGE || rules.challenge) {
    if (p >= ML_CHALLENGE) reasons.push({ code: 'ML_ELEVATED', detail: `p=${p.toFixed(4)} ≥ ${ML_CHALLENGE}` });
    return { verdict: 'CHALLENGE', reasons };
  }
  return { verdict: 'ALLOW', reasons: reasons.length ? reasons : [{ code: 'CLEAN', detail: `p=${p.toFixed(4)}` }] };
}

const SEVERITY_FOR = { ALLOW: 'info', CHALLENGE: 'notice', REVIEW: 'warn', BLOCK: 'critical' };

export function scoreTransaction(payload) {
  const rules = evaluateRules(payload);

  let p;
  let shortCircuit = false;
  if (rules.block && rules.reasons.some((r) => r.code === 'BLOCKLIST_HIT')) {
    p = 1.0;
    shortCircuit = true;
  } else {
    p = heuristicProbability(payload, rules.velocity);
  }

  const decision = decide({ p, rules });

  const tx = addTransaction({
    transactionId: payload.TransactionID ?? null,
    amount: payload.TransactionAmt,
    productCD: payload.ProductCD,
    payload,
    score: {
      fraudProbability: p,
      isFraud: p >= 0.7 || decision.verdict === 'BLOCK' || decision.verdict === 'REVIEW',
      threshold: 0.7,
      modelVersion: shortCircuit ? 'short-circuit' : 'demo-heuristic',
    },
    decision: { verdict: decision.verdict, reasons: decision.reasons },
  });

  let alert = null;
  if (decision.verdict === 'REVIEW' || decision.verdict === 'BLOCK') {
    alert = addAlert({
      transactionId: tx.transactionId,
      amount: tx.amount,
      fraudProbability: p,
      modelVersion: tx.score.modelVersion,
      verdict: decision.verdict,
      reasons: decision.reasons,
    });
  }

  const entityUpdates = [];
  const isHit = decision.verdict === 'REVIEW' || decision.verdict === 'BLOCK';
  for (const { key, type } of entityKeysFor(payload)) {
    const e = upsertEntity(key, type, (ent) => {
      ent.txCount += 1;
      if (isHit) ent.fraudCount += 1;
      if (decision.verdict === 'BLOCK') ent.blockCount += 1;
    });

    if (e.status === 'clean' && e.fraudCount >= FRAUD_HITS_TO_BLOCK) {
      e.status = 'blocked';
      e.blockedAt = new Date().toISOString();
      e.blockReason = `auto: ${e.fraudCount} fraud hits`;
      addEvent({
        code: 'AUTO_BLOCK',
        severity: 'critical',
        message: `${key} auto-blocklisted after ${e.fraudCount} fraud hits`,
        transactionId: tx.transactionId,
        entityKey: key,
        meta: { fraudCount: e.fraudCount, txCount: e.txCount },
      });
      entityUpdates.push({ key, type, autoBlocked: true });
    } else if (e.status === 'clean' && e.riskScore >= 0.4 && e.txCount >= 5) {
      e.status = 'watch';
    }
  }

  addEvent({
    code: `DECISION_${decision.verdict}`,
    severity: SEVERITY_FOR[decision.verdict] ?? 'info',
    message: `${decision.verdict} · p=${p.toFixed(4)}`,
    transactionId: tx.transactionId,
    meta: { amount: tx.amount, productCD: payload.ProductCD, reasons: decision.reasons.map((r) => r.code) },
  });

  return {
    transaction: tx,
    score: {
      transaction_id: tx.transactionId,
      fraud_probability: p,
      is_fraud: tx.score.isFraud,
      threshold: 0.7,
      model_version: tx.score.modelVersion,
    },
    decision,
    alert,
    entityUpdates,
  };
}
