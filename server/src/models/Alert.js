import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema(
  {
    transactionId: { type: Number, index: true },
    amount: Number,
    fraudProbability: Number,
    modelVersion: String,
    verdict: { type: String, enum: ['REVIEW', 'BLOCK'], default: 'REVIEW', index: true },
    reasons: { type: [{ code: String, detail: String }], default: [] },
    status: { type: String, enum: ['open', 'reviewed', 'dismissed'], default: 'open', index: true },
    notes: String,
  },
  { timestamps: true },
);

alertSchema.index({ status: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
