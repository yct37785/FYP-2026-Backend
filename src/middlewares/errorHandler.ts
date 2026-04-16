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
    const badRequestErrors = new Set<string>([
      ERR_MSGS.AUTH.EMAIL_ALREADY_REGISTERED,
      ERR_MSGS.AUTH.INVALID_EMAIL_OR_PASSWORD,
      ERR_MSGS.AUTH.ACCOUNT_SUSPENDED,
      ERR_MSGS.AUTH.ACCOUNT_DEACTIVATED,
      ERR_MSGS.ME.CATEGORY_ALREADY_EXISTS,
      ERR_MSGS.BOOKING.EVENT_SUSPENDED,
      ERR_MSGS.BOOKING.ALREADY_BOOKED,
      ERR_MSGS.BOOKING.INSUFFICIENT_CREDITS,
      ERR_MSGS.WAITLIST.ALREADY_WAITLISTED,
    ]);

    if (badRequestErrors.has(err.message)) {
      return res.status(400).json({
        error: err.message,
      });
    }

    const forbiddenErrors = new Set<string>([
      ERR_MSGS.AUTH.FORBIDDEN,
      ERR_MSGS.EVENT.EVENT_NOT_OWNER,
    ]);

    if (forbiddenErrors.has(err.message)) {
      return res.status(403).json({
        error: err.message,
      });
    }

    const notFoundErrors = new Set<string>([
      ERR_MSGS.AUTH.USER_NOT_FOUND,
      ERR_MSGS.ME.CATEGORY_NOT_FOUND,
      ERR_MSGS.ME.CATEGORY_PREFERENCE_NOT_FOUND,
      ERR_MSGS.EVENT.CATEGORY_NOT_FOUND,
      ERR_MSGS.EVENT.EVENT_NOT_FOUND,
      ERR_MSGS.BOOKING.BOOKING_NOT_FOUND,
      ERR_MSGS.WAITLIST.WAITLIST_NOT_FOUND,
    ]);

    if (notFoundErrors.has(err.message)) {
      return res.status(404).json({
        error: err.message,
      });
    }
  }

  return res.status(500).json({
    error: ERR_MSGS.GENERAL.INTERNAL_SERVER_ERROR,
  });
};