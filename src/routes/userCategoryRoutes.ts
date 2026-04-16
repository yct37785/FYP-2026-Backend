import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { UserCategoryController } from '@controllers/userCategoryController';

const router = Router();

router.get('/me/categories', authMiddleware, UserCategoryController.getMyCategories);
router.post('/me/categories', authMiddleware, UserCategoryController.addMyCategory);
router.delete(
  '/me/categories/:categoryId',
  authMiddleware,
  UserCategoryController.removeMyCategory
);

export default router;