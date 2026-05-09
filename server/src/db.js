import mongoose from 'mongoose';

export async function connectMongo() {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017';
  const dbName = process.env.MONGO_DB ?? 'fraud_detection';
  await mongoose.connect(uri, { dbName });
  console.log(`[gateway] mongo connected -> ${dbName}`);
}
