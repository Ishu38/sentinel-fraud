import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: Number, index: true },
    amount: { type: Number, required: true },
    productCD: String,
    payload: { type: mongoose.Schema.Types.Mixed },
    score: {
      fraudProbability: Number,
      isFraud: Boolean,
      threshold: Number,
      modelVersion: String,
    },
    decision: {
      verdict: { type: String, enum: ['ALLOW', 'CHALLENGE', 'REVIEW', 'BLOCK'], index: true },
      reasons: { type: [{ code: String, detail: String }], default: [] },
    },
    scoredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

transactionSchema.index({ 'score.isFraud': 1, scoredAt: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
