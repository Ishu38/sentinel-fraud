import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, index: true },
    severity: { type: String, enum: ['info', 'notice', 'warn', 'alert', 'critical'], default: 'info', index: true },
    message: String,
    transactionId: { type: Number, index: true },
    entityKey: { type: String, index: true },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

eventSchema.index({ createdAt: -1 });

export const Event = mongoose.model('Event', eventSchema);
