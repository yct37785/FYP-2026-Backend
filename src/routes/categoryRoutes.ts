import { Router } from 'express';
import { CategoryService } from '@services/categoryService';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const items = await CategoryService.getCategories();

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

export default router;