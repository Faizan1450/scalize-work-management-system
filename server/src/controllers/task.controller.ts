/**
 * task.controller.ts — Phase 3 complete task engine.
 *
 * Implements all 13 task endpoints with:
 * - Zod validation
 * - asyncHandler-compatible (no try/catch — throws propagate to central handler)
 * - Authorization enforced against DB state (not client role claims)
 * - All notifications via notify.ts (no inline Notification.create())
 * - IST-aware date logic via istDate.ts
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Task, ITaskDocument } from '../models/Task';
import { User, IUserDocument } from '../models/User';
import { getTeamForLead } from '../utils/teamHelper';
import { createNotification, createNotificationForTwo } from '../services/notify';
import { todayIST, isBeforeTodayIST, isAfterTodayIST } from '../utils/istDate';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  estimatedDurationMins: z.number().int().min(10, 'Duration must be between 10 minutes and 8 hours').max(480, 'Duration must be between 10 minutes and 8 hours'),
  taskDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'taskDate must be YYYY-MM-DD'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
  assigneeId: z.string().nullable().default(null),
  isOpenTask: z.boolean().default(false),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
});

const querySchema = z.object({
  assigneeId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isOpenTask: z.enum(['true', 'false']).optional(),
});

const statusSchema = z.object({
  status: z.enum(['not_started', 'in_progress', 'completed']),
});

const scheduleSchema = z.object({
  scheduledTime: z.string().regex(/^\d{2}:\d{2}$/, 'scheduledTime must be HH:mm').nullable(),
});

const moveSchema = z.object({
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'toDate must be YYYY-MM-DD'),
  comment: z.string().optional().default(''),
});

export const editTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  estimatedDurationMins: z.number().int().min(10, 'Duration must be between 10 minutes and 8 hours').max(480, 'Duration must be between 10 minutes and 8 hours').optional(),
  taskDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

const reassignSchema = z.object({
  assigneeId: z.string().min(1, 'assigneeId is required'),
});

const commentSchema = z.object({
  text: z.string().min(1, 'Comment text is required'),
});

const claimOpenSchema = z.object({
  assigneeId: z.string().min(1, 'assigneeId is required'),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  taskDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Add IST-derived isOverdue flag to a plain task object */
function withIsOverdue(task: ITaskDocument): Record<string, unknown> {
  const obj = task.toJSON() as Record<string, unknown>;
  const today = todayIST();
  const taskDate = obj['taskDate'] as string | undefined;
  const status = obj['status'] as string | undefined;
  obj['isOverdue'] = !!taskDate && taskDate < today && status !== 'completed';
  return obj;
}

/**
 * Extract a string ID from either a raw mongoose ObjectId or a populated document object.
 * The Task schema's pre('findOne') hook auto-populates assignerId/assigneeId,
 * so they may arrive as `{ _id: ObjectId, name: string, ... }` instead of a plain ObjectId.
 */
function toIdString(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'object' && '_id' in (val as Record<string, unknown>)) {
    return String((val as Record<string, unknown>)['_id']);
  }
  return String(val);
}

/**
 * Determine if the requester can see a task (used in GET /:id).
 * Returns true if visible; false if outside scope.
 */
async function canSeeTask(
  task: ITaskDocument,
  requesterId: string,
  requesterRoles: string[]
): Promise<boolean> {
  const isOwner = requesterRoles.includes('owner');
  const isLead = requesterRoles.includes('lead');

  // Always: own tasks (assignee or assigner)
  if (toIdString(task.assigneeId) === requesterId) return true;
  if (toIdString(task.assignerId) === requesterId) return true;

  // Open tasks: owner only
  if (task.isOpenTask) return isOwner;

  // Lead: tasks of their team members
  if (isLead) {
    if (!task.assigneeId) return false;
    const assignee = await User.findById(toIdString(task.assigneeId)).select('leadIds');
    if (!assignee) return false;
    return assignee.leadIds.some((lid) => lid.toString() === requesterId);
  }

  // Owner sees all non-open tasks (via team queries; also direct id fetch)
  if (isOwner) return true;

  return false;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/tasks
 * Create + assign a task.
 */
export async function createTask(req: Request, res: Response): Promise<void> {
  const parsed = createTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  const { title, description, estimatedDurationMins, taskDate, recurrence, assigneeId, isOpenTask, priority } = parsed.data;
  const requesterId = req.user!.sub;
  const requesterRoles = req.user!.roles;

  // Fetch requester from DB
  const requester = await User.findById(requesterId);
  if (!requester) {
    res.status(401).json({ error: 'Requester not found' });
    return;
  }

  // ── Case 1: Open task (isOpenTask=true, no assignee)
  if (isOpenTask) {
    if (assigneeId) {
      res.status(400).json({ error: 'Open tasks cannot have an assignee' });
      return;
    }

    const task = await Task.create({
      title, description, estimatedDurationMins, taskDate, recurrence,
      assigneeId: null,
      assignerId: requester._id,
      raisedBy: requester._id,   // preserved forever; never overwritten on claim
      isOpenTask: true,
      status: 'not_started',
      scheduledTime: null,
      priority,
    });

    // Notify owner (unless raiser IS the owner)
    if (!requesterRoles.includes('owner')) {
      const owner = await User.findOne({ roles: 'owner' });
      if (owner) {
        await createNotification(
          owner._id,
          'open_task_raised',
          `${requester.name} raised an open task: "${title}"`,
          task._id
        );
      }
    }

    res.status(201).json(withIsOverdue(task));
    return;
  }

  // ── Case 2: Self-task (assigneeId === self)
  if (assigneeId === requesterId || assigneeId === requester._id.toString()) {
    const task = await Task.create({
      title, description, estimatedDurationMins, taskDate, recurrence,
      assigneeId: requester._id,
      assignerId: requester._id,
      isOpenTask: false,
      status: 'not_started',
      scheduledTime: null,
      priority,
    });
    // No notification for self-tasks
    res.status(201).json(withIsOverdue(task));
    return;
  }

  // ── Case 3: Assigning to someone else — check authorization
  if (!assigneeId) {
    res.status(400).json({ error: 'assigneeId is required unless creating an open task or self-task' });
    return;
  }

  if (!mongoose.isValidObjectId(assigneeId)) {
    res.status(400).json({ error: 'Invalid assigneeId' });
    return;
  }

  const assignee = await User.findById(assigneeId);
  if (!assignee || !assignee.isActive) {
    res.status(404).json({ error: 'Assignee not found or inactive' });
    return;
  }

  // Authorization: owner can assign to anyone; lead can only assign to team members
  const isOwner = requesterRoles.includes('owner');
  if (!isOwner) {
    const isMapped = assignee.leadIds.some((lid) => lid.toString() === requester._id.toString());
    if (!isMapped) {
      res.status(403).json({ error: 'You can only assign tasks to employees in your team' });
      return;
    }
  }

  const task = await Task.create({
    title, description, estimatedDurationMins, taskDate, recurrence,
    assigneeId: assignee._id,
    assignerId: requester._id,
    isOpenTask: false,
    status: 'not_started',
    scheduledTime: null,
    priority,
  });

  // Notify assignee
  await createNotification(
    assignee._id,
    'task_assigned',
    `${requester.name} assigned you "${title}"`,
    task._id
  );

  res.status(201).json(withIsOverdue(task));
}

/**
 * GET /api/tasks
 * Visibility-enforced task list with three-bucket today logic.
 */
export async function listTasks(req: Request, res: Response): Promise<void> {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid query' });
    return;
  }

  const { assigneeId: assigneeIdParam, date, from, to, isOpenTask: openTaskParam } = parsed.data;
  const requesterId = req.user!.sub;
  const requesterRoles = req.user!.roles;
  const isOwner = requesterRoles.includes('owner');
  const isLead = requesterRoles.includes('lead');

  // ── isOpenTask=true: owner-only filter
  if (openTaskParam === 'true') {
    if (!isOwner) {
      res.json([]); // silent filter for non-owners
      return;
    }
    const tasks = await Task.find({ isOpenTask: true, assigneeId: null })
      .sort({ createdAt: -1 });
    res.json(tasks.map(withIsOverdue));
    return;
  }

  // ── Determine visible assignee IDs (server-side visibility enforcement)
  const requester = await User.findById(requesterId);
  if (!requester) {
    res.json([]);
    return;
  }

  const visibleAssigneeIds = new Set<string>([requester._id.toString()]);

  if (isOwner || isLead) {
    const allActive = await User.find({ isActive: true });
    const team = getTeamForLead(requester._id.toString(), isOwner, allActive);
    team.forEach((u) => visibleAssigneeIds.add(u._id.toString()));
  }

  // ── If assigneeId query param is provided, intersect with visibility
  // Correction 2c: if the requested assigneeId is outside the visible set,
  // return [] silently (no 403 — visibility is never disclosed).
  let assigneeIdFilter: mongoose.Types.ObjectId[] | null = null;
  if (assigneeIdParam) {
    if (!mongoose.isValidObjectId(assigneeIdParam) || !visibleAssigneeIds.has(assigneeIdParam)) {
      res.json([]); // requested assignee is outside visibility scope — silent empty
      return;
    }
    assigneeIdFilter = [new mongoose.Types.ObjectId(assigneeIdParam)];
  }

  const visibleIds = assigneeIdFilter
    ?? Array.from(visibleAssigneeIds).map((id) => new mongoose.Types.ObjectId(id));

  // Also include tasks where requester is the assigner (e.g. tasks they created for others)
  // When assigneeId is filtered, only show tasks assigned to that specific person (assigner view excluded)
  const baseFilter: mongoose.FilterQuery<ITaskDocument> = {
    isOpenTask: false,
  };

  if (assigneeIdFilter) {
    // Narrowed: only tasks assigned to the requested assignee within visible scope
    baseFilter['assigneeId'] = { $in: visibleIds };
  } else {
    // Broad: own tasks (as assignee or assigner) + team's tasks
    baseFilter['$or'] = [
      { assigneeId: { $in: visibleIds } },
      { assignerId: requester._id },
    ];
  }

  // ── Date filters — THREE-BUCKET RULE for today
  const today = todayIST();

  if (date) {
    if (date === today) {
      // Today: bucket 1 (scheduled/unscheduled today) + bucket 3 (carry-over)
      const visibilityClause = assigneeIdFilter
        ? { assigneeId: { $in: visibleIds } }
        : { $or: baseFilter['$or'] as mongoose.FilterQuery<ITaskDocument>[] };
      delete baseFilter['$or'];
      delete baseFilter['assigneeId'];
      baseFilter['$and'] = [
        visibilityClause,
        {
          $or: [
            { taskDate: date },                                 // bucket 1 & 2: scheduled/unscheduled today
            { taskDate: { $lt: today }, status: { $ne: 'completed' } }, // bucket 3: carry-over
          ],
        },
      ];
    } else {
      // Past or future date: only exact match
      baseFilter['taskDate'] = date;
    }
  } else if (from && to) {
    const visibilityClause = assigneeIdFilter
      ? { assigneeId: { $in: visibleIds } }
      : { $or: baseFilter['$or'] as mongoose.FilterQuery<ITaskDocument>[] };
    delete baseFilter['$or'];
    delete baseFilter['assigneeId'];
    baseFilter['$and'] = [
      visibilityClause,
      {
        $or: [
          { taskDate: { $gte: from, $lte: to } },
          { taskDate: { $lt: today }, status: { $ne: 'completed' } },
        ],
      },
    ];
  }

  const tasks = await Task.find(baseFilter).sort({ taskDate: 1, scheduledTime: 1, createdAt: 1 });
  res.json(tasks.map(withIsOverdue));
}


/**
 * GET /api/tasks/:id
 * Single task with visibility enforcement.
 */
export async function getTask(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid task id' });
    return;
  }

  const task = await Task.findById(id);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  const requesterId = req.user!.sub;
  const requesterRoles = req.user!.roles;

  const visible = await canSeeTask(task, requesterId, requesterRoles);
  if (!visible) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json(withIsOverdue(task));
}

/**
 * PATCH /api/tasks/:id/status
 * Assignee only. Captures actual times.
 */
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid status' });
    return;
  }

  const task = await Task.findById(req.params['id']);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const requesterId = req.user!.sub;
  const requester = await User.findById(requesterId);
  if (!requester) { res.status(401).json({ error: 'Requester not found' }); return; }

  // Assignee only
  if (toIdString(task.assigneeId) !== requester._id.toString()) {
    res.status(403).json({ error: 'Only the assignee can update task status' });
    return;
  }

  const { status } = parsed.data;
  const now = new Date();

  // actualStartTime: set on FIRST transition to in_progress (never overwritten)
  if (status === 'in_progress' && !task.actualStartTime) {
    task.actualStartTime = now;
  }

  // actualEndTime: set on every completion (overwritten on re-complete)
  if (status === 'completed') {
    task.actualEndTime = now;
  }

  task.status = status;
  await task.save();

  // Notify assigner on completion (skip self-tasks)
  if (status === 'completed' && toIdString(task.assignerId) !== requester._id.toString()) {
    const assigner = await User.findById(toIdString(task.assignerId));
    if (assigner) {
      await createNotification(
        assigner._id,
        'task_completed',
        `${requester.name} completed "${task.title}"`,
        task._id
      );
    }
  }

  res.json(withIsOverdue(task));
}

export async function scheduleTask(req: Request, res: Response): Promise<void> {
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid schedule data' });
    return;
  }

  const { scheduledTime } = parsed.data;

  const task = await Task.findById(req.params['id']);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const requesterId = req.user!.sub;
  const requester = await User.findById(requesterId);
  if (!requester) { res.status(401).json({ error: 'Requester not found' }); return; }

  // Assignee only
  if (toIdString(task.assigneeId) !== requester._id.toString()) {
    res.status(403).json({ error: 'Only the assignee can schedule tasks' });
    return;
  }

  task.scheduledTime = scheduledTime;
  await task.save();

  res.json(withIsOverdue(task));
}

/**
 * PATCH /api/tasks/:id/move
 * Assignee only. Move to a future date, off-day aware.
 */
export async function moveTask(req: Request, res: Response): Promise<void> {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid move data' });
    return;
  }

  const { toDate, comment } = parsed.data;

  // Must be strictly future (not today, not past)
  if (!isAfterTodayIST(toDate)) {
    res.status(400).json({ error: 'Move target must be a future date (not today or past)' });
    return;
  }

  const task = await Task.findById(req.params['id']);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const requesterId = req.user!.sub;
  const requester = await User.findById(requesterId);
  if (!requester) { res.status(401).json({ error: 'Requester not found' }); return; }

  // Assigner only
  if (toIdString(task.assignerId) !== requester._id.toString()) {
    res.status(403).json({ error: 'Only the assigner can move this task' });
    return;
  }

  // Block if completed
  if (task.status === 'completed') {
    res.status(400).json({ error: 'A completed task cannot be moved' });
    return;
  }

  const fromDate = task.taskDate;
  task.movedHistory.push({ fromDate, toDate, comment: comment ?? '' });
  task.taskDate = toDate;
  task.scheduledTime = null;
  await task.save();

  // Notify assignee (skip self-tasks)
  if (task.assigneeId && toIdString(task.assigneeId) !== requester._id.toString()) {
    const assigneeObj = await User.findById(toIdString(task.assigneeId));
    if (assigneeObj) {
      const msg = comment
        ? `${requester.name} moved "${task.title}" to ${toDate} — "${comment}"`
        : `${requester.name} moved "${task.title}" to ${toDate}`;
      await createNotification(assigneeObj._id, 'task_moved', msg, task._id);
    }
  }

  res.json(withIsOverdue(task));
}

/**
 * PATCH /api/tasks/:id
 * Edit — assigner only, status ≠ completed.
 */
export async function editTask(req: Request, res: Response): Promise<void> {
  const parsed = editTaskSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid edit data' });
    return;
  }

  const task = await Task.findById(req.params['id']);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const requesterId = req.user!.sub;
  const requester = await User.findById(requesterId);
  if (!requester) { res.status(401).json({ error: 'Requester not found' }); return; }

  // Owner can edit open tasks before claiming; all others must be the assigner
  const isOwner = req.user!.roles.includes('owner');
  const isAssigner = toIdString(task.assignerId) === requester._id.toString();
  if (!isAssigner && !(isOwner && task.isOpenTask)) {
    res.status(403).json({ error: 'Only the assigner can edit this task' });
    return;
  }

  // Block if completed
  if (task.status === 'completed') {
    res.status(400).json({ error: 'Cannot edit a completed task' });
    return;
  }

  const updates = parsed.data;
  if (updates.title !== undefined) task.title = updates.title;
  if (updates.description !== undefined) task.description = updates.description;
  if (updates.estimatedDurationMins !== undefined) task.estimatedDurationMins = updates.estimatedDurationMins;
  if (updates.taskDate !== undefined) task.taskDate = updates.taskDate;
  if (updates.recurrence !== undefined) task.recurrence = updates.recurrence;
  if (updates.priority !== undefined) task.priority = updates.priority;
  await task.save();

  // Notify assignee (skip self-tasks)
  if (task.assigneeId && toIdString(task.assigneeId) !== requester._id.toString()) {
    const assignee = await User.findById(toIdString(task.assigneeId));
    if (assignee) {
      await createNotification(
        assignee._id,
        'task_updated',
        `${requester.name} updated task "${task.title}"`,
        task._id
      );
    }
  }

  res.json(withIsOverdue(task));
}

/**
 * PATCH /api/tasks/:id/assignee
 * Reassign — assigner only, status = not_started, new assignee must be in team.
 */
export async function reassignTask(req: Request, res: Response): Promise<void> {
  const parsed = reassignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  const task = await Task.findById(req.params['id']);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const requesterId = req.user!.sub;
  const requesterRoles = req.user!.roles;
  const requester = await User.findById(requesterId);
  if (!requester) { res.status(401).json({ error: 'Requester not found' }); return; }

  // Assigner only
  if (toIdString(task.assignerId) !== requester._id.toString()) {
    res.status(403).json({ error: 'Only the assigner can reassign this task' });
    return;
  }

  // Status guard
  if (task.status !== 'not_started') {
    res.status(400).json({ error: 'Task can only be reassigned when status is not_started' });
    return;
  }

  const newAssigneeId = parsed.data.assigneeId;
  if (!mongoose.isValidObjectId(newAssigneeId)) {
    res.status(400).json({ error: 'Invalid assigneeId' });
    return;
  }

  const newAssignee = await User.findById(newAssigneeId);
  if (!newAssignee || !newAssignee.isActive) {
    res.status(404).json({ error: 'New assignee not found or inactive' });
    return;
  }

  // Authorization: owner can reassign to anyone; lead checks team membership
  const isOwner = requesterRoles.includes('owner');
  if (!isOwner) {
    const isMapped = newAssignee.leadIds.some((lid) => lid.toString() === requester._id.toString());
    if (!isMapped) {
      res.status(403).json({ error: 'New assignee must be in your team' });
      return;
    }
  }

  const oldAssignee = task.assigneeId ? await User.findById(task.assigneeId) : null;

  // Reset planning — new person plans their own day
  task.assigneeId = newAssignee._id;
  task.scheduledTime = null;
  // movedHistory and comments are preserved
  await task.save();

  // Notify old assignee
  if (oldAssignee) {
    await createNotification(
      oldAssignee._id,
      'task_reassigned',
      `"${task.title}" was reassigned to ${newAssignee.name}`,
      task._id
    );
  }

  // Notify new assignee
  await createNotification(
    newAssignee._id,
    'task_assigned',
    `${requester.name} assigned you "${task.title}"`,
    task._id
  );

  res.json(withIsOverdue(task));
}

/**
 * DELETE /api/tasks/:id
 * Assigner only, status = not_started only.
 */
export async function deleteTask(req: Request, res: Response): Promise<void> {
  const task = await Task.findById(req.params['id']);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const requesterId = req.user!.sub;
  const requester = await User.findById(requesterId);
  if (!requester) { res.status(401).json({ error: 'Requester not found' }); return; }

  // Assigner only
  if (toIdString(task.assignerId) !== requester._id.toString()) {
    res.status(403).json({ error: 'Only the assigner can delete this task' });
    return;
  }

  // Only while not_started
  if (task.status !== 'not_started') {
    res.status(400).json({ error: 'Task cannot be deleted after work has started' });
    return;
  }

  const taskTitle = task.title;
  const assigneeId = task.assigneeId;

  await Task.deleteOne({ _id: task._id });

  // Notify assignee (skip self-tasks)
  if (assigneeId && toIdString(assigneeId) !== requester._id.toString()) {
    const assignee = await User.findById(toIdString(assigneeId));
    if (assignee) {
      await createNotification(
        assignee._id,
        'task_deleted',
        `"${taskTitle}" was deleted by ${requester.name}`,
        null
      );
    }
  }

  res.json({ ok: true });
}

/**
 * POST /api/tasks/:id/comments
 * Assignee, assigner, any lead of assignee, OR owner.
 * Immutable — no edit/delete.
 */
export async function addComment(req: Request, res: Response): Promise<void> {
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  const task = await Task.findById(req.params['id']);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

  const requesterId = req.user!.sub;
  const requesterRoles = req.user!.roles;
  const requester = await User.findById(requesterId);
  if (!requester) { res.status(401).json({ error: 'Requester not found' }); return; }

  const isOwner = requesterRoles.includes('owner');
  const isAssignee = toIdString(task.assigneeId) === requester._id.toString();
  const isAssigner = toIdString(task.assignerId) === requester._id.toString();

  // Correction 5: authorization includes owner
  let isLeadOfAssignee = false;
  if (!isAssignee && !isAssigner && !isOwner && task.assigneeId) {
    const assignee = await User.findById(toIdString(task.assigneeId)).select('leadIds');
    isLeadOfAssignee = assignee?.leadIds.some((lid) => lid.toString() === requester._id.toString()) ?? false;
  }

  if (!isAssignee && !isAssigner && !isOwner && !isLeadOfAssignee) {
    res.status(403).json({ error: 'You are not authorized to comment on this task' });
    return;
  }

  // Push the comment
  task.comments.push({
    authorId: requester._id,
    text: parsed.data.text,
    createdAt: new Date(),
  });
  await task.save();

  // Notification routing:
  // - Assignee comments → notify assigner and any leads of the assignee
  // - Assigner comments → notify assignee
  // - Third party (lead/owner) comments → notify both assignee and assigner
  // - Skip self-notification (handled by set filtering/commenter deletion)
  const recipients = new Set<string>();
  const assigneeIdStr = task.assigneeId ? toIdString(task.assigneeId) : '';
  const assignerIdStr = task.assignerId ? toIdString(task.assignerId) : '';

  if (isAssignee) {
    if (assignerIdStr) {
      recipients.add(assignerIdStr);
    }
    if (task.assigneeId) {
      const assigneeUser = await User.findById(assigneeIdStr).select('leadIds');
      if (assigneeUser && assigneeUser.leadIds) {
        assigneeUser.leadIds.forEach((lid) => {
          recipients.add(lid.toString());
        });
      }
    }
  } else if (isAssigner) {
    if (assigneeIdStr) {
      recipients.add(assigneeIdStr);
    }
  } else {
    // Third-party
    if (assigneeIdStr) {
      recipients.add(assigneeIdStr);
    }
    if (assignerIdStr) {
      recipients.add(assignerIdStr);
    }
  }

  // Skip self-notification
  recipients.delete(requester._id.toString());

  for (const recipientId of recipients) {
    await createNotification(
      new mongoose.Types.ObjectId(recipientId),
      'comment_added',
      `${requester.name} commented on "${task.title}"`,
      task._id
    );
  }

  res.json(withIsOverdue(task));
}

/**
 * PATCH /api/tasks/:id/claim-open
 * Owner only. Convert open task to assigned task.
 */
export async function claimOpenTask(req: Request, res: Response): Promise<void> {
  const parsed = claimOpenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Invalid request' });
    return;
  }

  const requesterRoles = req.user!.roles;
  if (!requesterRoles.includes('owner')) {
    res.status(403).json({ error: 'Only the owner can claim open tasks' });
    return;
  }

  // Fetch owner from DB for _id and name (used in assignerId + notification)
  const requester = await User.findById(req.user!.sub);
  if (!requester) { res.status(401).json({ error: 'Requester not found' }); return; }

  const task = await Task.findById(req.params['id']);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  if (!task.isOpenTask) {
    res.status(400).json({ error: 'This task is not an open task' });
    return;
  }

  const { assigneeId, title, description, taskDate, priority } = parsed.data;
  if (!mongoose.isValidObjectId(assigneeId)) {
    res.status(400).json({ error: 'Invalid assigneeId' });
    return;
  }

  const assignee = await User.findById(assigneeId);
  if (!assignee || !assignee.isActive) {
    res.status(404).json({ error: 'Assignee not found or inactive' });
    return;
  }

  // Apply optional edits + convert to normal task
  task.isOpenTask = false;
  task.assigneeId = assignee._id;
  // The OWNER becomes the assigner on claim — drives authorization and "assigned by" display.
  // raisedBy is NOT touched (preserves raiser identity for history).
  task.assignerId = requester._id as unknown as typeof task.assignerId;
  if (title) task.title = title;
  if (description !== undefined) task.description = description;
  if (taskDate) task.taskDate = taskDate;
  if (priority !== undefined) task.priority = priority;
  await task.save();

  // Notify new assignee — message reads as from the OWNER
  await createNotification(
    assignee._id,
    'open_task_assigned',
    `${requester.name} assigned you "${task.title}"`,
    task._id
  );

  res.json(withIsOverdue(task));
}
