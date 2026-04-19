import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { WaitlistService } from '@services/waitlistService';

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

    const result = await WaitlistService.createWaitlist(req.user.userId, eventId);

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

    const items = await WaitlistService.getMyWaitlists(req.user.userId);

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/events/:eventId/status', authMiddleware, async (req, res, next) => {
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

    const result = await WaitlistService.getMyWaitlistStatus(
      req.user.userId,
      eventId
    );

    return res.status(200).json(result);
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

    const waitlistId = Number(req.params.id);

    if (Number.isNaN(waitlistId)) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.INVALID_INPUT,
      });
    }

    await WaitlistService.deleteMyWaitlist(req.user.userId, waitlistId);

    return res.status(200).json({
      message: 'Waitlist entry deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;