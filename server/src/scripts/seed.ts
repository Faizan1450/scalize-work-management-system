/**
 * Seed script — creates the initial owner account.
 *
 * Usage: npm run seed (from root or server workspace)
 *
 * Idempotent: if OWNER_USER_ID already exists, logs and exits cleanly.
 * Never duplicates, never overwrites.
 *
 * env vars required: OWNER_USER_ID, OWNER_PASSWORD, OWNER_NAME
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import mongoose from 'mongoose';
import { env } from '../config/env';
import { User } from '../models/User';
import { hashPassword } from '../utils/password';

const AVATAR_COLORS = [
  '#1e3a5f', '#7c3aed', '#be185d', '#0891b2', '#16a34a',
  '#ea580c', '#db2777', '#ca8a04', '#dc2626', '#0d9488',
];

async function seed() {
  console.log('[seed] Connecting to MongoDB Atlas...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('[seed] Connected.');

  // Idempotency check
  const existing = await User.findOne({ userId: env.OWNER_USER_ID });
  if (existing) {
    console.log(`[seed] Owner "${env.OWNER_USER_ID}" already exists — nothing to do.`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await hashPassword(env.OWNER_PASSWORD);

  await User.create({
    name: env.OWNER_NAME,
    userId: env.OWNER_USER_ID,
    passwordHash,
    roles: ['owner', 'lead', 'employee'],
    leadIds: [],
    workSchedule: {
      '0': 0,  // Sunday — off
      '1': 8,  // Monday
      '2': 8,  // Tuesday
      '3': 8,  // Wednesday
      '4': 8,  // Thursday
      '5': 8,  // Friday
      '6': 8,  // Saturday
    },
    isActive: true,
    avatarColor: AVATAR_COLORS[0],
  });

  console.log(`[seed] ✅ Owner "${env.OWNER_USER_ID}" (${env.OWNER_NAME}) created successfully.`);
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
