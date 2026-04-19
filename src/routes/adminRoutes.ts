import { Router } from 'express';
import { authMiddleware } from '@middlewares/authMiddleware';
import { roleMiddleware } from '@middlewares/roleMiddleware';
import { ERR_MSGS } from '@const/errorMessages';
import { AdminService } from '@services/adminService';
import { SyncLogsService } from '@services/syncLogsService';

const router = Router();

router.get(
  '/sync-logs',
  authMiddleware,
  roleMiddleware('admin'),
  async (_req, res, next) => {
    try {
      const items = await SyncLogsService.getSyncLogs();

      return res.status(200).json({
        count: items.length,
        items,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  '/reports',
  authMiddleware,
  roleMiddleware('admin'),
  async (_req, res, next) => {
    try {
      const items = await AdminService.getAllReports();

      return res.status(200).json({
        count: items.length,
        items,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/reports/:reportId/dismiss',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res, next) => {
    try {
      const reportId = Number(req.params.reportId);

      if (Number.isNaN(reportId)) {
        return res.status(400).json({
          error: ERR_MSGS.REPORT.INVALID_INPUT,
        });
      }

      await AdminService.dismissReport(reportId);

      return res.status(200).json({
        message: 'Report dismissed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/reports/:reportId/resolve-event',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res, next) => {
    try {
      const reportId = Number(req.params.reportId);

      if (Number.isNaN(reportId)) {
        return res.status(400).json({
          error: ERR_MSGS.REPORT.INVALID_INPUT,
        });
      }

      await AdminService.resolveEventReport(reportId);

      return res.status(200).json({
        message: 'Event report resolved and event suspended successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/reports/:reportId/resolve-review',
  authMiddleware,
  roleMiddleware('admin'),
  async (req, res, next) => {
    try {
      const reportId = Number(req.params.reportId);

      if (Number.isNaN(reportId)) {
        return res.status(400).json({
          error: ERR_MSGS.REPORT.INVALID_INPUT,
        });
      }

      await AdminService.resolveReviewReport(reportId);

      return res.status(200).json({
        message: 'Review report resolved and review suspended successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;