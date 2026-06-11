import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';

/**
 * canViewUser — allows GET /api/users/:id if:
 *   1. Requester is owner, OR
 *   2. Requester appears in target user's leadIds, OR
 *   3. Requester IS the target user
 *
 * Must be used after verifyToken. Reads :id from req.params.
 */
export async function canViewUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  const requesterId = req.user?.sub;
  const targetId = req.params['id'];

  if (!requesterId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Owner can view anyone
  if (req.user?.roles.includes('owner')) {
    next();
    return;
  }

  // Requester is viewing themselves
  if (requesterId === targetId) {
    next();
    return;
  }

  // Check if requester is in target's leadIds
  const target = await User.findById(targetId).select('leadIds').lean();
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const inLeadIds = target.leadIds.some((lid) => lid.toString() === requesterId);
  if (inLeadIds) {
    next();
    return;
  }

  res.status(403).json({ error: 'Forbidden' });
}
