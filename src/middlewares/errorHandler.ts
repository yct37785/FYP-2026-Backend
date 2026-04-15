import { NextFunction, Request, Response } from 'express';
import { ERR_MSGS } from '@const/errorMessages';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err instanceof Error) {
    const authErrors = new Set<string>([
      ERR_MSGS.AUTH.EMAIL_ALREADY_REGISTERED,
      ERR_MSGS.AUTH.INVALID_EMAIL_OR_PASSWORD,
      ERR_MSGS.AUTH.ACCOUNT_SUSPENDED,
      ERR_MSGS.AUTH.ACCOUNT_DEACTIVATED,
    ]);

    if (authErrors.has(err.message)) {
      return res.status(400).json({
        error: err.message,
      });
    }

    if (err.message === ERR_MSGS.AUTH.USER_NOT_FOUND) {
      return res.status(404).json({
        error: err.message,
      });
    }
  }

  return res.status(500).json({
    error: ERR_MSGS.GENERAL.INTERNAL_SERVER_ERROR,
  });
};