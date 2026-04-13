import { NextFunction, Request, Response } from 'express';
import { AuthService } from '@services/authService';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({
          error: 'name, email and password are required',
        });
      }

      const result = await AuthService.register({ name, email, password });

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'email and password are required',
        });
      }

      const result = await AuthService.login({ email, password });

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
        });
      }

      const user = await AuthService.getCurrentUser(req.user.userId);

      return res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }
}