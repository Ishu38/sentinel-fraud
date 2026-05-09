import { Router } from 'express';
import { Transaction } from '../models/Transaction.js';
import { Alert } from '../models/Alert.js';
import { Entity } from '../models/Entity.js';
import { Event } from '../models/Event.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      scored,
      flagged,
      verdictAgg,
      openAlerts,
      lastFlagged,
      blockedEntities,
      watchEntities,
      criticalEvents,
    ] = await Promise.all([
      Transaction.countDocuments({ createdAt: { $gte: since } }),
      Transaction.countDocuments({ createdAt: { $gte: since }, 'score.isFraud': true }),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$decision.verdict', n: { $sum: 1 } } },
      ]),
      Alert.countDocuments({ status: 'open' }),
      Transaction.findOne({ 'score.isFraud': true }).sort({ createdAt: -1 }).lean(),
      Entity.countDocuments({ status: 'blocked' }),
      Entity.countDocuments({ status: 'watch' }),
      Event.countDocuments({ createdAt: { $gte: since }, severity: { $in: ['alert', 'critical'] } }),
    ]);

    const verdicts = Object.fromEntries(verdictAgg.map((v) => [v._id ?? 'UNKNOWN', v.n]));

    res.json({
      windowHours: 24,
      scored,
      flagged,
      flagRate: scored ? flagged / scored : 0,
      openAlerts,
      lastFlaggedAt: lastFlagged?.createdAt ?? null,
      verdicts: {
        ALLOW: verdicts.ALLOW ?? 0,
        CHALLENGE: verdicts.CHALLENGE ?? 0,
        REVIEW: verdicts.REVIEW ?? 0,
        BLOCK: verdicts.BLOCK ?? 0,
      },
      entities: {
        blocked: blockedEntities,
        watch: watchEntities,
      },
      criticalEvents,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
