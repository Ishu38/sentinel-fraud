import { Router } from 'express';
import { Alert } from '../models/Alert.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status;
    const limit = Math.min(Number(req.query.limit ?? 50), 500);
    const filter = status ? { status } : {};
    const items = await Alert.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { status, notes } = req.body ?? {};
    if (status && !['open', 'reviewed', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'invalid status' });
    }
    const updated = await Alert.findByIdAndUpdate(
      req.params.id,
      { ...(status ? { status } : {}), ...(notes !== undefined ? { notes } : {}) },
      { new: true },
    );
    if (!updated) return res.status(404).json({ error: 'not_found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

export default router;
