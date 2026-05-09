import { Entity } from '../models/Entity.js';
import { logEvent } from './events.js';

const FRAUD_HITS_TO_BLOCK = 3;

export function entityKeysFor(payload) {
  const keys = [];
  if (payload?.card1 != null) keys.push({ type: 'card', key: `card:${payload.card1}` });
  if (payload?.P_emaildomain) keys.push({ type: 'email', key: `email:${payload.P_emaildomain}` });
  return keys;
}

export async function getBlockedEntities(payload) {
  const keys = entityKeysFor(payload).map((k) => k.key);
  if (!keys.length) return [];
  return Entity.find({ key: { $in: keys }, status: 'blocked' }).lean();
}

export async function recordEntityActivity({ payload, decision, transactionId }) {
  const out = [];
  const isHit = decision.verdict === 'REVIEW' || decision.verdict === 'BLOCK';

  for (const { key, type } of entityKeysFor(payload)) {
    const incFraud = isHit ? 1 : 0;
    const incBlock = decision.verdict === 'BLOCK' ? 1 : 0;
    await Entity.updateOne(
      { key },
      {
        $inc: { txCount: 1, fraudCount: incFraud, blockCount: incBlock },
        $set: { lastSeen: new Date() },
        $setOnInsert: { type, status: 'clean', firstSeen: new Date() },
      },
      { upsert: true },
    );

    const entity = await Entity.findOne({ key }).lean();
    if (entity) {
      const newRisk = entity.txCount ? entity.fraudCount / entity.txCount : 0;
      if (Math.abs((entity.riskScore ?? 0) - newRisk) > 0.001) {
        await Entity.updateOne({ key }, { $set: { riskScore: newRisk } });
      }
      if (
        entity.status === 'clean' &&
        entity.fraudCount >= FRAUD_HITS_TO_BLOCK
      ) {
        await Entity.updateOne(
          { key },
          {
            $set: {
              status: 'blocked',
              blockedAt: new Date(),
              blockReason: `auto: ${entity.fraudCount} fraud hits`,
            },
          },
        );
        await logEvent({
          code: 'AUTO_BLOCK',
          severity: 'critical',
          message: `${key} auto-blocklisted after ${entity.fraudCount} fraud hits`,
          transactionId,
          entityKey: key,
          meta: { fraudCount: entity.fraudCount, txCount: entity.txCount },
        });
        out.push({ key, type, autoBlocked: true });
      } else if (entity.status === 'clean' && newRisk >= 0.4 && entity.txCount >= 5) {
        await Entity.updateOne({ key }, { $set: { status: 'watch' } });
      }
    }
  }
  return out;
}
