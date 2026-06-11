import { Router } from 'express';
import { verifyToken } from '../middleware/verifyToken';
import { login, me, changePassword } from '../controllers/auth.controller';
import asyncHandler from '../utils/asyncHandler';

const router = Router();

// Public
router.post('/login', asyncHandler(login));

// Protected
router.get('/me', verifyToken, asyncHandler(me));
router.post('/change-password', verifyToken, asyncHandler(changePassword));

export default router;
