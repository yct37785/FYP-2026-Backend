import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { roleMiddleware } from '@middlewares/roleMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { EventService } from '@services/eventService';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const parsedCategoryId = req.query.category_id
      ? Number(req.query.category_id)
      : undefined;

    const parsedMinPrice = req.query.min_price
      ? Number(req.query.min_price)
      : undefined;

    const parsedMaxPrice = req.query.max_price
      ? Number(req.query.max_price)
      : undefined;

    const parsedStartsFrom = req.query.starts_from
      ? new Date(String(req.query.starts_from))
      : undefined;

    const parsedStartsTo = req.query.starts_to
      ? new Date(String(req.query.starts_to))
      : undefined;

    if (
      (req.query.category_id && Number.isNaN(parsedCategoryId)) ||
      (req.query.min_price && Number.isNaN(parsedMinPrice)) ||
      (req.query.max_price && Number.isNaN(parsedMaxPrice)) ||
      (req.query.starts_from && (!parsedStartsFrom || Number.isNaN(parsedStartsFrom.getTime()))) ||
      (req.query.starts_to && (!parsedStartsTo || Number.isNaN(parsedStartsTo.getTime())))
    ) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.INVALID_INPUT,
      });
    }

    const items = await EventService.getEvents({
      categoryId: parsedCategoryId,
      city: req.query.city ? String(req.query.city) : undefined,
      venue: req.query.venue ? String(req.query.venue) : undefined,
      minPrice: parsedMinPrice,
      maxPrice: parsedMaxPrice,
      startsFrom: parsedStartsFrom,
      startsTo: parsedStartsTo,
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
    });

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const eventId = Number(req.params.id);

    if (Number.isNaN(eventId)) {
      return res.status(400).json({
        error: ERR_MSGS.EVENT.INVALID_INPUT,
      });
    }

    const item = await EventService.getEventById(eventId);

    return res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

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
  }
);

export default router;