import { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@mytypes/user';
import { ERR_MSGS } from '@const/errorMessages';

export const roleMiddleware = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: ERR_MSGS.AUTH.FORBIDDEN,
      });
    }

    next();
  };
};