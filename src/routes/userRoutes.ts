import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { UserService } from '@services/userService';
import { ERR_MSGS } from '@const/errorMessages';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const item = await UserService.getMyProfile(req.user.userId);

    return res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

router.put('/', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const {
      name,
      profilePicUrl,
      description,
      gender,
      age,
    } = req.body;

    const allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say'];

    const parsedAge =
      age === undefined || age === null || age === ''
        ? age
        : Number(age);

    if (
      (name !== undefined && !String(name).trim()) ||
      (profilePicUrl !== undefined &&
        profilePicUrl !== null &&
        typeof profilePicUrl !== 'string') ||
      (description !== undefined &&
        description !== null &&
        typeof description !== 'string') ||
      (gender !== undefined &&
        gender !== null &&
        !allowedGenders.includes(String(gender))) ||
      (parsedAge !== undefined &&
        parsedAge !== null &&
        (Number.isNaN(parsedAge) || parsedAge < 0))
    ) {
      return res.status(400).json({
        error: ERR_MSGS.ME.INVALID_PROFILE_INPUT,
      });
    }

    const result = await UserService.updateMyProfile(req.user.userId, {
      ...(name !== undefined ? { name: String(name).trim() } : {}),
      ...(profilePicUrl !== undefined ? { profilePicUrl } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(gender !== undefined ? { gender } : {}),
      ...(parsedAge !== undefined ? { age: parsedAge } : {}),
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/categories', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const items = await UserService.getMyCategories(req.user.userId);

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

    const result = await UserService.addMyCategory(req.user.userId, categoryId);

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

    const result = await UserService.removeMyCategory(req.user.userId, categoryId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;