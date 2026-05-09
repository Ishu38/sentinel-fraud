import { Router } from 'express';
import { engineHealth } from '../lib/engine.js';

const router = Router();

router.get('/health', async (_req, res, next) => {
  try {
    const engine = await engineHealth();
    res.json({ status: 'ok', engine });
  } catch (err) {
    next(err);
  }
});

export default router;
