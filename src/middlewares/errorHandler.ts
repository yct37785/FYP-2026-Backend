import { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  if (err instanceof Error) {
    if (
      err.message === 'Email is already registered' ||
      err.message === 'Invalid email or password' ||
      err.message.startsWith('Account is')
    ) {
      return res.status(400).json({
        error: err.message,
      });
    }

    if (err.message === 'User not found') {
      return res.status(404).json({
        error: err.message,
      });
    }
  }

  return res.status(500).json({
    error: 'Internal server error',
  });
};