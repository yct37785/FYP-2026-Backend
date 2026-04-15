import { Request, Response } from 'express';
import { ERR_MSGS } from '@const/errorMessages';

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    error: `${ERR_MSGS.GENERAL.ROUTE_NOT_FOUND_PREFIX} ${req.method} ${req.originalUrl}`,
  });
};