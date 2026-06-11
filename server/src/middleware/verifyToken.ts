import { Request, Response, NextFunction } from 'express';
import { verifyTokenPayload, JwtPayload } from '../utils/jwt';

// Extend Express Request to carry the decoded token payload
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function verifyToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    req.user = verifyTokenPayload(token);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
