import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * asyncHandler — wraps an async Express controller so that any rejection
 * is forwarded to the central error handler via next(err).
 *
 * Usage at route-registration level:
 *   router.post('/', requireOwner, asyncHandler(createUser));
 *
 * Express 4 does NOT auto-forward unhandled promise rejections, so without
 * this wrapper a thrown error kills the process (audit bug C1).
 */
const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
