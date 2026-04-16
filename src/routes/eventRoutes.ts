import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { roleMiddleware } from '@middlewares/roleMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { EventService } from '@services/eventService';

const router = Router();

router.post(
  '/',
  authMiddleware,
  roleMiddleware('organizer', 'admin'),
  async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const {
      title,
      description,
      bannerUrl,
      categoryId,
      venue,
      address,
      city,
      startsAt,
      endsAt,
      price,
    } = req.body;

    const parsedCategoryId = Number(categoryId);
    const startsAtDate = new Date(startsAt);
    const endsAtDate = new Date(endsAt);
    const parsedPrice = Number(price);

    if (
      !title ||
      !description ||
      Number.isNaN(parsedCategoryId) ||
      !venue ||
      !address ||
      !city ||
      Number.isNaN(startsAtDate.getTime()) ||
      Number.isNaN(endsAtDate.getTime()) ||
      endsAtDate <= startsAtDate ||
      Number.isNaN(parsedPrice) ||
      parsedPrice < 0
    ) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.INVALID_INPUT,
      });
    }

    const result = await EventService.createEvent({
      ownerId: req.user.userId,
      title,
      description,
      bannerUrl: bannerUrl ?? null,
      categoryId: parsedCategoryId,
      venue,
      address,
      city,
      startsAt: startsAtDate,
      endsAt: endsAtDate,
      price: parsedPrice,
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.patch(
  '/:id/publish',
  authMiddleware,
  roleMiddleware('organizer', 'admin'),
  async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const eventId = Number(req.params.id);

    if (Number.isNaN(eventId)) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.EVENT_NOT_FOUND,
      });
    }

    const result = await EventService.publishEvent(eventId, req.user.userId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;