import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { MeService } from '@services/meService';
import { ERR_MSGS } from '@const/errorMessages';

const router = Router();

router.get('/categories', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const items = await MeService.getMyCategories(req.user.userId);

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/categories', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const categoryId = Number(req.body.categoryId);

    if (Number.isNaN(categoryId)) {
      return res.status(400).json({
        error: ERR_MSGS.ME.CATEGORY_ID_REQUIRED,
      });
    }

    const result = await MeService.addMyCategory(req.user.userId, categoryId);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:categoryId', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const categoryId = Number(req.params.categoryId);

    if (Number.isNaN(categoryId)) {
      return res.status(400).json({
        error: ERR_MSGS.ME.CATEGORY_ID_REQUIRED,
      });
    }

    const result = await MeService.removeMyCategory(req.user.userId, categoryId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;