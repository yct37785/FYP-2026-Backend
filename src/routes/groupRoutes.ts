import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { GroupService } from '@services/groupService';

const router = Router();

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const categoryId = req.query.category_id
      ? Number(req.query.category_id)
      : undefined;

    if (req.query.category_id && Number.isNaN(categoryId)) {
      return res.status(400).json({
        error: ERR_MSGS.GROUP.INVALID_INPUT,
      });
    }

    const items = await GroupService.getGroups({
      userId: req.user.userId,
      categoryId,
    });

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const { name, description, categoryId } = req.body;
    const parsedCategoryId =
      categoryId === undefined || categoryId === null || categoryId === ''
        ? null
        : Number(categoryId);

    if (
      !String(name ?? '').trim() ||
      !String(description ?? '').trim() ||
      (parsedCategoryId !== null && Number.isNaN(parsedCategoryId))
    ) {
      return res.status(400).json({
        error: ERR_MSGS.GROUP.INVALID_INPUT,
      });
    }

    const result = await GroupService.createGroup({
      ownerId: req.user.userId,
      name: String(name).trim(),
      description: String(description).trim(),
      categoryId: parsedCategoryId,
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const groupId = Number(req.params.id);

    if (Number.isNaN(groupId)) {
      return res.status(400).json({
        error: ERR_MSGS.GROUP.INVALID_INPUT,
      });
    }

    const result = await GroupService.getGroupById(groupId, req.user.userId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const groupId = Number(req.params.id);

    if (Number.isNaN(groupId)) {
      return res.status(400).json({
        error: ERR_MSGS.GROUP.INVALID_INPUT,
      });
    }

    await GroupService.deleteGroup(groupId, req.user.userId, req.user.role);

    return res.status(200).json({
      message: 'Group deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/join', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const groupId = Number(req.params.id);

    if (Number.isNaN(groupId)) {
      return res.status(400).json({
        error: ERR_MSGS.GROUP.INVALID_INPUT,
      });
    }

    const result = await GroupService.joinGroup(groupId, req.user.userId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/leave', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const groupId = Number(req.params.id);

    if (Number.isNaN(groupId)) {
      return res.status(400).json({
        error: ERR_MSGS.GROUP.INVALID_INPUT,
      });
    }

    const result = await GroupService.leaveGroup(groupId, req.user.userId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
