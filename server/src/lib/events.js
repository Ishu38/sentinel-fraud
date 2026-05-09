import { Event } from '../models/Event.js';
import { sseBroadcast } from './sse.js';

export async function logEvent({ code, severity = 'info', message, transactionId, entityKey, meta }) {
  const doc = await Event.create({ code, severity, message, transactionId, entityKey, meta });
  sseBroadcast('event', {
    _id: doc._id.toString(),
    code,
    severity,
    message,
    transactionId,
    entityKey,
    meta,
    createdAt: doc.createdAt,
  });
  return doc;
}
