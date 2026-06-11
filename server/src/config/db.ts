import mongoose from 'mongoose';
import { env } from './env';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[db] Connected to MongoDB Atlas');
  } catch (err) {
    console.error('[db] Connection failed:', err);
    process.exit(1);
  }
}
