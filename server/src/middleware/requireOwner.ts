import { Request, Response, NextFunction } from 'express';

/** Allows only users with the 'owner' role. Must be used after verifyToken. */
export function requireOwner(req: Request, res: Response, next: NextFunction): void {
  if (!req.user?.roles.includes('owner')) {
    res.status(403).json({ error: 'Forbidden: owner access required' });
    return;
  }
  next();
}
