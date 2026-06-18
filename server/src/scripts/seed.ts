/**
 * Seed script — creates the initial owner account.
 *
 * Usage: npm run seed (from root or server workspace)
 *
 * Safety rules (Phase 3):
 *  1. Refuses to run if ANY user with role 'owner' already exists — protects
 *     the single-owner invariant. Drop/migrate manually if re-seeding is needed.
 *  2. Uses OWNER_USER_ID / OWNER_PASSWORD / OWNER_NAME from .env.
 *
 * Owner profile fields (Phase 3 additions):
 *  email, phone, joiningDate, designation
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

  // ── Safety guard: refuse if any owner already exists ─────────────────────
  // This protects the single-owner rule at seed level.
  // If you need to re-seed: manually drop the users collection first.
  const existingOwner = await User.findOne({ roles: 'owner' });
  if (existingOwner) {
    console.log(
      `[seed] ⚠️  An owner account already exists (userId: "${existingOwner.userId}").`,
      '\n[seed]    Seed refused — single-owner rule. Drop the users collection manually to re-seed.'
    );
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
    // Phase 3 owner profile
    email: 'syedfaizanali1450@gmail.com',
    phone: '9770093064',
    joiningDate: '2021-07-01',
    designation: 'Operations Head & Strategist',
    isActive: true,
    avatarColor: AVATAR_COLORS[0],
  });

  console.log(`[seed] ✅ Owner "${env.OWNER_USER_ID}" (${env.OWNER_NAME}) created successfully.`);
  console.log('[seed]    → Profile: Operations Head & Strategist, joined 2021-07-01');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Fatal error:', err);
  process.exit(1);
});
