import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { env } from '@config/env';
import { CalendarService } from '@services/calendarService';

const router = Router();

router.get('/google/auth-url', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const url = CalendarService.getGoogleAuthUrl(req.user.userId);

    return res.status(200).json({ url });
  } catch (error) {
    next(error);
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    const code = req.query.code ? String(req.query.code) : '';
    const state = req.query.state ? String(req.query.state) : '';

    if (!code || !state) {
      return res.redirect(`${env.frontendAppUrl}/user/calendar?connected=0`);
    }

    await CalendarService.handleGoogleCallback(code, state);

    return res.redirect(`${env.frontendAppUrl}/user/calendar?connected=1`);
  } catch (error) {
    console.error(error);
    return res.redirect(`${env.frontendAppUrl}/user/calendar?connected=0`);
  }
});

router.get('/status', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const result = await CalendarService.getConnectionStatus(req.user.userId);

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/google/disconnect', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    await CalendarService.disconnect(req.user.userId);

    return res.status(200).json({
      message: 'Google Calendar disconnected successfully',
    });
  } catch (error) {
    next(error);
  }
});

router.post('/sync-bookings', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const items = await CalendarService.syncMyBookings(req.user.userId);

    return res.status(200).json({
      count: items.length,
      items,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
