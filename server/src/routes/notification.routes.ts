import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken';
import asyncHandler from '../utils/asyncHandler';
import {
  listNotifications,
  markRead,
  markAllRead,
} from '../controllers/notification.controller';

const router = Router();

// All notification routes require authentication
router.use(verifyToken);

// GET  /api/notifications           — list own, newest first, ?unread=true
router.get('/', asyncHandler(listNotifications));

// PATCH /api/notifications/read-all — must come BEFORE /:id/read to avoid route conflict
router.patch('/read-all', asyncHandler(markAllRead));

// PATCH /api/notifications/:id/read
router.patch('/:id/read', asyncHandler(markRead));

export default router;
