import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { UserCategoryService } from '@services/userCategoryService';
import { ERR_MSGS } from '@const/errorMessages';

const router = Router();

router.get('/me/categories', authMiddleware, async (req, res, next) => {
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
});

router.post('/me/categories', authMiddleware, async (req, res, next) => {
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
});

router.delete('/me/categories/:categoryId', authMiddleware, async (req, res, next) => {
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
});

export default router;