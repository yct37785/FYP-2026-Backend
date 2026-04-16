import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { WaitlistService } from '@services/waitlistService';

const router = Router();

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

router.get('/mine/:id', authMiddleware, async (req, res, next) => {
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

    const item = await WaitlistService.getMyWaitlistById(
      req.user.userId,
      waitlistId
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