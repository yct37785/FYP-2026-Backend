import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { FavoriteService } from '@services/favoriteService';

const router = Router();

router.post('/events/:eventId', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const eventId = Number(req.params.eventId);

    if (Number.isNaN(eventId)) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.INVALID_INPUT,
      });
    }

    const result = await FavoriteService.createFavorite(req.user.userId, eventId);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/mine', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const items = await FavoriteService.getMyFavorites(req.user.userId);

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/mine/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const favoriteId = Number(req.params.id);

    if (Number.isNaN(favoriteId)) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.INVALID_INPUT,
      });
    }

    const item = await FavoriteService.getMyFavoriteById(
      req.user.userId,
      favoriteId
    );

    return res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

router.delete('/mine/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const favoriteId = Number(req.params.id);

    if (Number.isNaN(favoriteId)) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.INVALID_INPUT,
      });
    }

    await FavoriteService.deleteMyFavorite(req.user.userId, favoriteId);

    return res.status(200).json({
      message: 'Favorite deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/events/:eventId', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const eventId = Number(req.params.eventId);

    if (Number.isNaN(eventId)) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.INVALID_INPUT,
      });
    }

    await FavoriteService.deleteMyFavoriteByEventId(req.user.userId, eventId);

    return res.status(200).json({
      message: 'Favorite deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;