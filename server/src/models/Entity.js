import mongoose from 'mongoose';

const entitySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['card', 'email'], required: true },
    txCount: { type: Number, default: 0 },
    fraudCount: { type: Number, default: 0 },
    blockCount: { type: Number, default: 0 },
    riskScore: { type: Number, default: 0 },
    status: { type: String, enum: ['clean', 'watch', 'blocked'], default: 'clean', index: true },
    blockedAt: Date,
    blockReason: String,
    firstSeen: { type: Date, default: Date.now },
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

entitySchema.index({ status: 1, fraudCount: -1 });
entitySchema.index({ riskScore: -1 });

export const Entity = mongoose.model('Entity', entitySchema);
