import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken';
import asyncHandler from '../utils/asyncHandler';
import {
  createTask,
  listTasks,
  getTask,
  updateStatus,
  scheduleTask,
  moveTask,
  editTask,
  reassignTask,
  deleteTask,
  addComment,
  claimOpenTask,
} from '../controllers/task.controller';

const router = Router();

// All task routes require authentication
router.use(verifyToken);

// ── Task CRUD ─────────────────────────────────────────────────────────────────
router.post('/', asyncHandler(createTask));
router.get('/', asyncHandler(listTasks));
router.get('/:id', asyncHandler(getTask));
router.patch('/:id', asyncHandler(editTask));
router.delete('/:id', asyncHandler(deleteTask));

// ── Sub-resource actions (must come BEFORE /:id to avoid conflicts) ───────────
router.patch('/:id/status', asyncHandler(updateStatus));
router.patch('/:id/schedule', asyncHandler(scheduleTask));
router.patch('/:id/move', asyncHandler(moveTask));
router.patch('/:id/assignee', asyncHandler(reassignTask));
router.patch('/:id/claim-open', asyncHandler(claimOpenTask));

// ── Comments ──────────────────────────────────────────────────────────────────
router.post('/:id/comments', asyncHandler(addComment));

export default router;
