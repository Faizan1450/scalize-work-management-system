import { Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { verifyPassword, hashPassword } from '../utils/password';
import { signToken } from '../utils/jwt';

// ── Zod schemas ───────────────────────────────────────────────────────────────

const loginSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Public route.
 */
export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'userId and password are required' });
    return;
  }

  const { userId, password } = parsed.data;

  const user = await User.findOne({ userId });

  // Same error message for wrong user AND wrong password — prevents user enumeration
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: 'Account deactivated' });
    return;
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({
    sub: user._id.toString(),
    roles: user.roles,
  });

  // toJSON transform strips passwordHash automatically
  res.json({ token, user: user.toJSON() });
}

/**
 * GET /api/auth/me
 * Protected — verifyToken applied in router.
 * Returns fresh user from DB so role/mapping changes reflect without re-login.
 */
export async function me(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user.toJSON());
}

/**
 * POST /api/auth/change-password
 * Protected — any authenticated user (self-service).
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  const { oldPassword, newPassword } = parsed.data;

  const user = await User.findById(req.user!.sub).select('+passwordHash');
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const valid = await verifyPassword(oldPassword, user.passwordHash);
  if (!valid) {
    res.status(400).json({ error: 'Current password is incorrect' });
    return;
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  res.json({ ok: true });
}
