import { Transaction } from '../models/Transaction.js';
import { entityKeysFor, getBlockedEntities } from './entities.js';

const RISKY_EMAIL_DOMAINS = new Set(['protonmail.com', 'anonymous.com', 'mail.com', 'tutanota.com']);
const VELOCITY_WINDOW_MS = 60_000;
const VELOCITY_LIMIT = 5;

export async function evaluateRules(payload) {
  const reasons = [];
  let block = false;
  let challenge = false;

  // 1. Blocklist check
  const blocked = await getBlockedEntities(payload);
  if (blocked.length) {
    block = true;
    for (const e of blocked) {
      reasons.push({ code: 'BLOCKLIST_HIT', detail: e.key });
    }
  }

  // 2. Velocity rule
  if (payload?.card1 != null) {
    const since = new Date(Date.now() - VELOCITY_WINDOW_MS);
    const recent = await Transaction.countDocuments({
      'payload.card1': payload.card1,
      createdAt: { $gte: since },
    });
    if (recent >= VELOCITY_LIMIT) {
      block = true;
      reasons.push({
        code: 'VELOCITY_BURST',
        detail: `${recent + 1} tx · 60s window`,
      });
    } else if (recent >= 3) {
      challenge = true;
      reasons.push({ code: 'VELOCITY_ELEVATED', detail: `${recent + 1} tx · 60s window` });
    }
  }

  // 3. Risky email reputation
  if (payload?.P_emaildomain && RISKY_EMAIL_DOMAINS.has(payload.P_emaildomain)) {
    challenge = true;
    reasons.push({ code: 'EMAIL_LOW_REPUTATION', detail: payload.P_emaildomain });
  }

  // 4. Cross-domain mismatch (recipient differs from payer at high amount)
  if (
    payload?.R_emaildomain &&
    payload?.P_emaildomain &&
    payload.R_emaildomain !== payload.P_emaildomain &&
    (payload.TransactionAmt ?? 0) > 1000
  ) {
    challenge = true;
    reasons.push({
      code: 'CROSS_DOMAIN_HIGH_VALUE',
      detail: `${payload.P_emaildomain} → ${payload.R_emaildomain} @ $${payload.TransactionAmt}`,
    });
  }

  // 5. Amount anomaly (very high single transaction)
  if ((payload?.TransactionAmt ?? 0) > 5000) {
    challenge = true;
    reasons.push({
      code: 'AMOUNT_OUTLIER',
      detail: `$${payload.TransactionAmt} > $5,000`,
    });
  }

  return { block, challenge, reasons, entitiesChecked: entityKeysFor(payload) };
}
