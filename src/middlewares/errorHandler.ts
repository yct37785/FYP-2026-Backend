import { NextFunction, Request, Response } from 'express';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err);

  return res.status(500).json({
    error: 'Internal server error',
  });
};