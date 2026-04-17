import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { NotificationService } from '@services/notificationService';

const router = Router();

router.get('/mine', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const fromRaw = req.query.from ? String(req.query.from) : undefined;
    const fromDate = fromRaw ? new Date(fromRaw) : undefined;

    if (fromRaw && Number.isNaN(fromDate?.getTime())) {
      return res.status(400).json({
        error: ERR_MSGS.NOTIFICATION.INVALID_INPUT,
      });
    }

    const items = await NotificationService.getMyNotifications(
      req.user.userId,
      fromDate
    );

    return res.status(200).json({
      count: items.length,
      items,
    });
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

    const notificationId = Number(req.params.id);

    if (Number.isNaN(notificationId)) {
      return res.status(400).json({
        error: ERR_MSGS.NOTIFICATION.INVALID_INPUT,
      });
    }

    await NotificationService.deleteMyNotification(
      req.user.userId,
      notificationId
    );

    return res.status(200).json({
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;