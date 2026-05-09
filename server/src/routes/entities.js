import { Router } from 'express';
import { Entity } from '../models/Entity.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status;
    const limit = Math.min(Number(req.query.limit ?? 25), 200);
    const filter = status ? { status } : {};
    const items = await Entity.find(filter)
      .sort({ status: 1, fraudCount: -1, riskScore: -1 })
      .limit(limit)
      .lean();
    const counts = await Entity.aggregate([
      { $group: { _id: '$status', n: { $sum: 1 } } },
    ]);
    res.json({
      items,
      counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:key', async (req, res, next) => {
  try {
    const { status, blockReason } = req.body ?? {};
    if (!['clean', 'watch', 'blocked'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const updated = await Entity.findOneAndUpdate(
      { key: req.params.key },
      {
        $set: {
          status,
          ...(status === 'blocked' ? { blockedAt: new Date(), blockReason: blockReason ?? 'manual' } : {}),
        },
      },
      { new: true },
    );
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
