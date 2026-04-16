import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { BookingService } from '@services/bookingService';

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

    const result = await BookingService.createBooking(req.user.userId, eventId);

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;