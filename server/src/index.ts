import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ZodError } from 'zod';
import { env } from './config/env';
import { connectDB } from './config/db';

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, ts: Date.now() });
});

import authRouter from './routes/auth.routes';
import userRouter from './routes/user.routes';
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);

// ── Central error handler ─────────────────────────────────────────────────────
// Handles: ZodError (validation) → 400; MongoServerError E11000 → 409;
// explicit status errors → that status; everything else → 500 + server log.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; code?: number }, _req: Request, res: Response, _next: NextFunction) => {
  // Zod validation errors — return the first human-readable message
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.errors[0]?.message ?? 'Validation error' });
    return;
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000) {
    res.status(409).json({ error: 'User ID already exists' });
    return;
  }

  const status = err.status ?? 500;
  const message = status < 500 ? err.message : 'Internal server error';
  if (status >= 500) console.error('[error]', err);
  res.status(status).json({ error: message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(env.PORT, () => {
    console.log(`[server] Listening on http://localhost:${env.PORT}`);
  });
});

export default app;
