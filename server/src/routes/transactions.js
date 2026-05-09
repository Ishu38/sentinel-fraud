import { Router } from 'express';
import { scoreTransaction } from '../lib/engine.js';
import { evaluateRules } from '../lib/rules.js';
import { decide } from '../lib/decisions.js';
import { recordEntityActivity } from '../lib/entities.js';
import { logEvent } from '../lib/events.js';
import { sseBroadcast } from '../lib/sse.js';
import { Transaction } from '../models/Transaction.js';
import { Alert } from '../models/Alert.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const payload = req.body ?? {};
    if (typeof payload.TransactionAmt !== 'number') {
      return res.status(400).json({ error: 'TransactionAmt (number) is required' });
    }

    // 1. Rules pre-flight (cheap, skips ML if blocklisted)
    const rules = await evaluateRules(payload);

    let mlScore;
    if (rules.block && rules.reasons.some((r) => r.code === 'BLOCKLIST_HIT')) {
      // Don't waste an ML call on a blocked entity — short-circuit.
      mlScore = {
        fraud_probability: 1.0,
        is_fraud: true,
        threshold: 0.7,
        model_version: 'short-circuit',
        skipped: true,
      };
    } else {
      mlScore = await scoreTransaction(payload);
    }

    // 2. Combine ML + rules into a decision
    const decision = decide({ ml: mlScore, rules });

    // 3. Persist transaction
    const tx = await Transaction.create({
      transactionId: payload.TransactionID ?? null,
      amount: payload.TransactionAmt,
      productCD: payload.ProductCD,
      payload,
      score: {
        fraudProbability: mlScore.fraud_probability,
        isFraud: mlScore.is_fraud,
        threshold: mlScore.threshold,
        modelVersion: mlScore.model_version,
      },
      decision: { verdict: decision.verdict, reasons: decision.reasons },
    });

    // 4. Open an alert for REVIEW or BLOCK
    let alert = null;
    if (decision.verdict === 'REVIEW' || decision.verdict === 'BLOCK') {
      alert = await Alert.create({
        transactionId: tx.transactionId,
        amount: tx.amount,
        fraudProbability: mlScore.fraud_probability,
        modelVersion: mlScore.model_version,
        verdict: decision.verdict,
        reasons: decision.reasons,
      });
    }

    // 5. Update entity reputation (may auto-blocklist)
    const entityUpdates = await recordEntityActivity({
      payload,
      decision,
      transactionId: tx.transactionId,
    });

    // 6. Audit log + live broadcast
    const severityFor = {
      ALLOW: 'info',
      CHALLENGE: 'notice',
      REVIEW: 'warn',
      BLOCK: 'critical',
    };
    await logEvent({
      code: `DECISION_${decision.verdict}`,
      severity: severityFor[decision.verdict] ?? 'info',
      message: `${decision.verdict} · p=${mlScore.fraud_probability.toFixed(4)}`,
      transactionId: tx.transactionId,
      meta: {
        amount: tx.amount,
        productCD: payload.ProductCD,
        reasons: decision.reasons.map((r) => r.code),
      },
    });

    sseBroadcast('transaction', {
      _id: tx._id.toString(),
      transactionId: tx.transactionId,
      amount: tx.amount,
      productCD: payload.ProductCD,
      score: tx.score,
      decision: tx.decision,
      createdAt: tx.createdAt,
    });

    res.json({
      transaction: tx,
      score: mlScore,
      decision,
      alert,
      entityUpdates,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 500);
    const verdict = req.query.verdict;
    const filter = verdict ? { 'decision.verdict': verdict } : {};
    const items = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

export default router;
