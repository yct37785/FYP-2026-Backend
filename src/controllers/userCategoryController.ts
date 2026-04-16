import { NextFunction, Request, Response } from 'express';
import { UserCategoryService } from '@services/userCategoryService';
import { ERR_MSGS } from '@const/errorMessages';

export class UserCategoryController {
  static async getMyCategories(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: ERR_MSGS.AUTH.UNAUTHORIZED,
        });
      }

      const items = await UserCategoryService.getMyCategories(req.user.userId);

      return res.status(200).json({
        count: items.length,
        items,
      });
    } catch (error) {
      next(error);
    }
  }

  static async addMyCategory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: ERR_MSGS.AUTH.UNAUTHORIZED,
        });
      }

      const categoryId = Number(req.body.categoryId);

      if (Number.isNaN(categoryId)) {
        return res.status(400).json({
          error: ERR_MSGS.USER_CATEGORY.CATEGORY_ID_REQUIRED,
        });
      }

      const result = await UserCategoryService.addCategoryToUser(
        req.user.userId,
        categoryId
      );

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async removeMyCategory(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: ERR_MSGS.AUTH.UNAUTHORIZED,
        });
      }

      const categoryId = Number(req.params.categoryId);

      if (Number.isNaN(categoryId)) {
        return res.status(400).json({
          error: ERR_MSGS.USER_CATEGORY.CATEGORY_ID_REQUIRED,
        });
      }

      const result = await UserCategoryService.removeCategoryFromUser(
        req.user.userId,
        categoryId
      );

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}