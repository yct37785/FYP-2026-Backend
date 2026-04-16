import { NextFunction, Request, Response } from 'express';
import { SetupService } from '@services/setupService';

export class SetupController {
  static async setup(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SetupService.resetDatabase();

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}