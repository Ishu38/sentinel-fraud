import { Router } from 'express';
import { sseHandler, sseSubscriberCount } from '../lib/sse.js';

const router = Router();

router.get('/', sseHandler);

router.get('/_status', (_req, res) => {
  res.json({ subscribers: sseSubscriberCount() });
});

export default router;
