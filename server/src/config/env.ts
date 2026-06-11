import dotenv from 'dotenv';
import path from 'path';

// Load .env from the server/ directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`[env] FATAL: Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return val;
}

export const env = {
  PORT: parseInt(process.env['PORT'] ?? '5000', 10),
  MONGODB_URI: requireEnv('MONGODB_URI'),
  JWT_SECRET: requireEnv('JWT_SECRET'),
  CLIENT_ORIGIN: process.env['CLIENT_ORIGIN'] ?? 'http://localhost:5173',
  OWNER_USER_ID: requireEnv('OWNER_USER_ID'),
  OWNER_PASSWORD: requireEnv('OWNER_PASSWORD'),
  OWNER_NAME: requireEnv('OWNER_NAME'),
} as const;
