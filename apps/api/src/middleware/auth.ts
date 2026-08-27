import type { NextFunction, Request, Response } from 'express';

import { verifyToken } from '../lib/jwt';
import { ApiError } from './errorHandler';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.token as string | undefined;

  if (!token) {
    return next(new ApiError(401, 'Authentication required'));
  }

  try {
    req.userId = verifyToken(token);
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired session'));
  }
}
