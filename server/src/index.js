import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import { connectMongo } from './db.js';
import healthRoutes from './routes/health.js';
import transactionRoutes from './routes/transactions.js';
import alertRoutes from './routes/alerts.js';
import statsRoutes from './routes/stats.js';
import entityRoutes from './routes/entities.js';
import eventRoutes from './routes/events.js';
import streamRoutes from './routes/stream.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api', healthRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/stream', streamRoutes);

app.use((err, req, res, _next) => {
  console.error('[gateway:error]', err);
  res.status(err.status ?? 500).json({ error: err.message ?? 'internal_error' });
});

const port = Number(process.env.GATEWAY_PORT ?? 4000);

await connectMongo();
app.listen(port, () => {
  console.log(`[gateway] listening on :${port}`);
  console.log(`[gateway] engine = ${process.env.ENGINE_URL ?? 'http://localhost:8000'}`);
});
