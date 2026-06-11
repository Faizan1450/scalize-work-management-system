import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { User, Role } from '../models/User';
import { hashPassword } from '../utils/password';
import { getTeamForLead, wouldCreateCycle } from '../utils/teamHelper';

// ── Palette ───────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  '#1e3a5f', '#7c3aed', '#be185d', '#0891b2', '#16a34a',
  '#ea580c', '#db2777', '#ca8a04', '#dc2626', '#0d9488',
];

// ── Zod schemas ───────────────────────────────────────────────────────────────

const workScheduleSchema = z.object({
  '0': z.number().min(0).max(24),
  '1': z.number().min(0).max(24),
  '2': z.number().min(0).max(24),
  '3': z.number().min(0).max(24),
  '4': z.number().min(0).max(24),
  '5': z.number().min(0).max(24),
  '6': z.number().min(0).max(24),
});

const createUserSchema = z.object({
  name: z.string().min(1),
  userId: z.string().regex(/^[a-z0-9.]+$/, 'userId must be lowercase alphanumeric with dots only'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  workSchedule: workScheduleSchema,
  leadIds: z.array(z.string()).optional().default([]),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  joiningDate: z.string().optional().default(''),
  designation: z.string().optional().default(''),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  userId: z.string().regex(/^[a-z0-9.]+$/).optional(),
  roles: z.array(z.enum(['owner', 'lead', 'employee'])).optional(),
  workSchedule: workScheduleSchema.optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  joiningDate: z.string().optional(),
  designation: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateLeadsSchema = z.object({
  leadIds: z.array(z.string()),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/users  (owner only)
 * Creates a new employee. roles always forced to ['employee'].
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  const { name, userId, password, workSchedule, leadIds, phone, email, joiningDate, designation } = parsed.data;

  // Validate leadIds exist and are active leads
  if (leadIds.length > 0) {
    for (const lid of leadIds) {
      if (!mongoose.isValidObjectId(lid)) {
        res.status(400).json({ error: `Invalid leadId: ${lid}` });
        return;
      }
      const lead = await User.findById(lid).select('isActive roles');
      if (!lead || !lead.isActive || !lead.roles.includes('lead')) {
        res.status(400).json({ error: `leadId ${lid} is not an active lead` });
        return;
      }
    }
  }

  const totalUsers = await User.countDocuments();
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name,
    userId,
    passwordHash,
    roles: ['employee'], // Always forced — roles raised via PATCH after creation
    leadIds: leadIds.map((id) => new mongoose.Types.ObjectId(id)),
    workSchedule,
    phone,
    email,
    joiningDate,
    designation,
    isActive: true,
    avatarColor: pickColor(totalUsers),
  });

  res.status(201).json(user.toJSON());
}

/**
 * GET /api/users
 * Owner: all users (active by default; ?includeInactive=true to include deactivated)
 * Lead: only their mapped employees
 * Employee: 403
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  const requesterId = req.user!.sub;
  const isOwner = req.user!.roles.includes('owner');
  const isLead = req.user!.roles.includes('lead');

  if (!isOwner && !isLead) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (isOwner) {
    const includeInactive = req.query['includeInactive'] === 'true';
    const filter = includeInactive ? {} : { isActive: true };
    const users = await User.find(filter).sort({ name: 1 });
    res.json(users.map((u) => u.toJSON()));
    return;
  }

  // Lead view — always active only
  const allActive = await User.find({ isActive: true });
  const team = getTeamForLead(requesterId, false, allActive);
  res.json(team.map((u) => u.toJSON()));
}

/**
 * GET /api/users/:id
 * Authorization: canViewUser middleware handles this.
 */
export async function getUser(req: Request, res: Response): Promise<void> {
  const user = await User.findById(req.params['id']);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user.toJSON());
}

/**
 * PATCH /api/users/:id  (owner only)
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  const target = await User.findById(req.params['id']);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const updates = parsed.data;

  // ── Single owner protections ──────────────────────────────────────────────
  if (target.roles.includes('owner')) {
    // Owner cannot be deactivated
    if (updates.isActive === false) {
      res.status(400).json({ error: 'Owner account cannot be deactivated' });
      return;
    }
    // Owner role cannot be removed from the owner
    if (updates.roles && !updates.roles.includes('owner')) {
      res.status(400).json({ error: "Owner role cannot be removed from the owner account" });
      return;
    }
  }

  // Nobody else can get the owner role
  if (!target.roles.includes('owner') && updates.roles?.includes('owner')) {
    res.status(400).json({ error: 'Only one owner is supported' });
    return;
  }

  // ── Validate userId uniqueness if changing ────────────────────────────────
  if (updates.userId && updates.userId !== target.userId) {
    const conflict = await User.findOne({ userId: updates.userId });
    if (conflict) {
      res.status(409).json({ error: 'A user with that userId already exists' });
      return;
    }
  }

  // Apply updates
  Object.assign(target, updates);
  await target.save();

  res.json(target.toJSON());
}

/**
 * PATCH /api/users/:id/leads  (owner only)
 * Replaces leadIds for a user. Validates: active leads only, no cycles, no owner-as-target.
 */
export async function updateLeads(req: Request, res: Response): Promise<void> {
  const parsed = updateLeadsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'leadIds must be an array of strings' });
    return;
  }

  const target = await User.findById(req.params['id']);
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Owner cannot have leads assigned to them
  if (target.roles.includes('owner') && parsed.data.leadIds.length > 0) {
    res.status(400).json({ error: 'Owner is the top of the hierarchy' });
    return;
  }

  const { leadIds } = parsed.data;
  const targetId = target._id.toString();

  // Validate each leadId
  for (const lid of leadIds) {
    if (!mongoose.isValidObjectId(lid)) {
      res.status(400).json({ error: `Invalid leadId: ${lid}` });
      return;
    }
    if (lid === targetId) {
      res.status(400).json({ error: 'A user cannot be their own lead' });
      return;
    }
    const lead = await User.findById(lid).select('isActive roles');
    if (!lead || !lead.isActive || !lead.roles.includes('lead')) {
      res.status(400).json({ error: `leadId ${lid} is not an active lead` });
      return;
    }
  }

  // Circular mapping check
  const allUsers = await User.find({});
  if (wouldCreateCycle(targetId, leadIds, allUsers)) {
    res.status(400).json({ error: 'Circular lead mapping detected' });
    return;
  }

  target.leadIds = leadIds.map((id) => new mongoose.Types.ObjectId(id));
  await target.save();

  res.json(target.toJSON());
}

/**
 * PATCH /api/users/:id/password  (owner only)
 * Password reset — no old-password check required (owner authority).
 */
export async function resetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  const user = await User.findById(req.params['id']);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  user.passwordHash = await hashPassword(parsed.data.newPassword);
  await user.save();

  res.json({ ok: true });
}
