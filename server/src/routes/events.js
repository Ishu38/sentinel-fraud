import { Router } from 'express';
import { Event } from '../models/Event.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const severity = req.query.severity;
    const filter = severity ? { severity } : {};
    const items = await Event.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

export default router;
