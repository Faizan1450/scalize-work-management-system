import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/notifications
 * Own notifications only, newest first, capped at 100.
 * ?unread=true  → filter to unread only
 */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const recipientId = new mongoose.Types.ObjectId(req.user!.sub);
  const unreadOnly = req.query['unread'] === 'true';

  const filter: Record<string, unknown> = { recipientId };
  if (unreadOnly) filter['read'] = false;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(notifications.map((n) => n.toJSON()));
}

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read. Own only.
 */
export async function markRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid notification id' });
    return;
  }

  const notif = await Notification.findById(id);
  if (!notif) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }

  // Own only
  if (notif.recipientId.toString() !== req.user!.sub) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  notif.read = true;
  await notif.save();
  res.json(notif.toJSON());
}

/**
 * PATCH /api/notifications/read-all
 * Mark ALL unread notifications for the requester as read.
 */
export async function markAllRead(req: Request, res: Response): Promise<void> {
  const recipientId = new mongoose.Types.ObjectId(req.user!.sub);

  await Notification.updateMany(
    { recipientId, read: false },
    { $set: { read: true } }
  );

  res.json({ ok: true });
}
