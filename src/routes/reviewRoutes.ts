import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { ReviewService } from '@services/reviewService';

const router = Router();

router.post('/events/:eventId', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: ERR_MSGS.AUTH.UNAUTHORIZED });
    }

    const eventId = Number(req.params.eventId);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment ?? '').trim();

    if (
      Number.isNaN(eventId) ||
      Number.isNaN(rating) ||
      rating < 1 ||
      rating > 5 ||
      !comment
    ) {
      return res.status(400).json({ error: ERR_MSGS.REVIEW.INVALID_INPUT });
    }

    const result = await ReviewService.createReview(
      req.user.userId,
      eventId,
      rating,
      comment
    );

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/events/:eventId', async (req, res, next) => {
  try {
    const eventId = Number(req.params.eventId);

    if (Number.isNaN(eventId)) {
      return res.status(400).json({ error: ERR_MSGS.REVIEW.INVALID_INPUT });
    }

    const items = await ReviewService.getEventReviews(eventId);

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/mine', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: ERR_MSGS.AUTH.UNAUTHORIZED });
    }

    const items = await ReviewService.getMyReviews(req.user.userId);

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
      return res.status(401).json({ error: ERR_MSGS.AUTH.UNAUTHORIZED });
    }

    const reviewId = Number(req.params.id);

    if (Number.isNaN(reviewId)) {
      return res.status(400).json({ error: ERR_MSGS.REVIEW.INVALID_INPUT });
    }

    const item = await ReviewService.getMyReviewById(req.user.userId, reviewId);

    return res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

router.put('/mine/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: ERR_MSGS.AUTH.UNAUTHORIZED });
    }

    const reviewId = Number(req.params.id);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment ?? '').trim();

    if (
      Number.isNaN(reviewId) ||
      Number.isNaN(rating) ||
      rating < 1 ||
      rating > 5 ||
      !comment
    ) {
      return res.status(400).json({ error: ERR_MSGS.REVIEW.INVALID_INPUT });
    }

    const result = await ReviewService.updateMyReview(
      req.user.userId,
      reviewId,
      rating,
      comment
    );

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/mine/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: ERR_MSGS.AUTH.UNAUTHORIZED });
    }

    const reviewId = Number(req.params.id);

    if (Number.isNaN(reviewId)) {
      return res.status(400).json({ error: ERR_MSGS.REVIEW.INVALID_INPUT });
    }

    await ReviewService.deleteMyReview(req.user.userId, reviewId);

    return res.status(200).json({
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;