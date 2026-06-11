import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken';
import { requireOwner } from '../middleware/requireOwner';
import { canViewUser } from '../middleware/canViewUser';
import {
  createUser,
  listUsers,
  getUser,
  updateUser,
  updateLeads,
  resetPassword,
} from '../controllers/user.controller';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// All user routes require authentication
router.use(verifyToken);

router.post('/', requireOwner, asyncHandler(createUser));
router.get('/', asyncHandler(listUsers));
router.get('/:id', canViewUser, asyncHandler(getUser));
router.patch('/:id', requireOwner, asyncHandler(updateUser));
router.patch('/:id/leads', requireOwner, asyncHandler(updateLeads));
router.patch('/:id/password', requireOwner, asyncHandler(resetPassword));

export default router;
