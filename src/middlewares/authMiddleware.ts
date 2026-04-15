import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '@utils/jwt';
import { ERR_MSGS } from '@const/errorMessages';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.AUTH_HEADER_REQUIRED,
      });
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.INVALID_AUTH_FORMAT,
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      error: ERR_MSGS.AUTH.INVALID_OR_EXPIRED_TOKEN,
    });
  }
};