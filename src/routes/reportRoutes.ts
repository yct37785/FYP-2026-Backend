import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { ReportService } from '@services/reportService';

const router = Router();

router.post('/events/:eventId', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const eventId = Number(req.params.eventId);
    const reason = String(req.body.reason ?? '').trim();
    const details =
      req.body.details !== undefined ? String(req.body.details).trim() : null;

    if (Number.isNaN(eventId) || !reason) {
      return res.status(400).json({
        error: ERR_MSGS.REPORT.INVALID_INPUT,
      });
    }

    const result = await ReportService.createEventReport(
      req.user.userId,
      eventId,
      reason,
      details
    );

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/reviews/:reviewId', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const reviewId = Number(req.params.reviewId);
    const reason = String(req.body.reason ?? '').trim();
    const details =
      req.body.details !== undefined ? String(req.body.details).trim() : null;

    if (Number.isNaN(reviewId) || !reason) {
      return res.status(400).json({
        error: ERR_MSGS.REPORT.INVALID_INPUT,
      });
    }

    const result = await ReportService.createReviewReport(
      req.user.userId,
      reviewId,
      reason,
      details
    );

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

    const items = await ReportService.getMyReports(req.user.userId);

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

    const reportId = Number(req.params.id);

    if (Number.isNaN(reportId)) {
      return res.status(400).json({
        error: ERR_MSGS.REPORT.INVALID_INPUT,
      });
    }

    const item = await ReportService.getMyReportById(
      req.user.userId,
      reportId
    );

    return res.status(200).json(item);
  } catch (error) {
    next(error);
  }
});

router.put('/mine/:id', authMiddleware, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: ERR_MSGS.AUTH.UNAUTHORIZED,
      });
    }

    const reportId = Number(req.params.id);
    const reason = String(req.body.reason ?? '').trim();
    const details =
      req.body.details !== undefined ? String(req.body.details).trim() : null;

    if (Number.isNaN(reportId) || !reason) {
      return res.status(400).json({
        error: ERR_MSGS.REPORT.INVALID_INPUT,
      });
    }

    const result = await ReportService.updateMyReport(
      req.user.userId,
      reportId,
      reason,
      details
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

    const reportId = Number(req.params.id);

    if (Number.isNaN(reportId)) {
      return res.status(400).json({
        error: ERR_MSGS.REPORT.INVALID_INPUT,
      });
    }

    await ReportService.deleteMyReport(req.user.userId, reportId);

    return res.status(200).json({
      message: 'Report deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;