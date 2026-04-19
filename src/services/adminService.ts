import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import { NOTIFICATION_MSGS } from '@const/notificationMessages';
import { NotificationService } from '@services/notificationService';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';

interface ReportRow extends RowDataPacket {
  id: number;
  user_id: number;
  event_id: number | null;
  review_id: number | null;
  reason: string;
  details: string | null;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
}

interface EventOwnerRow extends RowDataPacket {
  id: number;
  title: string;
  owner_id: number;
}

interface ReviewOwnerRow extends RowDataPacket {
  id: number;
  comment: string;
  user_id: number;
  event_id: number;
  event_title: string;
  is_suspended: number;
}

export class AdminService {
  private static async getOpenReportOrThrow(
    reportId: number,
    connection: PoolConnection
  ): Promise<ReportRow> {
    const [rows] = await connection.execute<ReportRow[]>(
      `
      SELECT
        id,
        user_id,
        event_id,
        review_id,
        reason,
        details,
        status
      FROM report
      WHERE id = ?
      LIMIT 1
      `,
      [reportId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.REPORT.REPORT_NOT_FOUND);
    }

    const report = rows[0];

    if (report.status !== 'OPEN') {
      throw new Error(ERR_MSGS.REPORT.REPORT_ALREADY_PROCESSED);
    }

    return report;
  }

  static async dismissReport(reportId: number): Promise<void> {
    const pool = Db.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const report = await AdminService.getOpenReportOrThrow(reportId, connection);

      await connection.execute(
        `
        UPDATE report
        SET status = 'DISMISSED'
        WHERE id = ?
        `,
        [reportId]
      );

      await NotificationService.createNotification(
        connection,
        report.user_id,
        NOTIFICATION_MSGS.REPORT.DISMISSED(reportId)
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async resolveEventReport(reportId: number): Promise<void> {
    const pool = Db.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const report = await AdminService.getOpenReportOrThrow(reportId, connection);

      if (!report.event_id) {
        throw new Error(ERR_MSGS.REPORT.INVALID_INPUT);
      }

      const [eventRows] = await connection.execute<EventOwnerRow[]>(
        `
        SELECT
          id,
          title,
          owner_id
        FROM event
        WHERE id = ?
        LIMIT 1
        `,
        [report.event_id]
      );

      if (eventRows.length === 0) {
        throw new Error(ERR_MSGS.EVENT.EVENT_NOT_FOUND);
      }

      const event = eventRows[0];

      await connection.execute(
        `
        UPDATE event
        SET is_suspended = TRUE
        WHERE id = ?
        `,
        [event.id]
      );

      await connection.execute(
        `
        UPDATE report
        SET status = 'RESOLVED'
        WHERE id = ?
        `,
        [reportId]
      );

      await NotificationService.createNotification(
        connection,
        report.user_id,
        NOTIFICATION_MSGS.REPORT.RESOLVED_EVENT(reportId, event.title)
      );

      await NotificationService.createNotification(
        connection,
        event.owner_id,
        NOTIFICATION_MSGS.EVENT.SUSPENDED(event.title)
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async resolveReviewReport(reportId: number): Promise<void> {
    const pool = Db.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const report = await AdminService.getOpenReportOrThrow(reportId, connection);

      if (!report.review_id) {
        throw new Error(ERR_MSGS.REPORT.INVALID_INPUT);
      }

      const [reviewRows] = await connection.execute<ReviewOwnerRow[]>(
        `
        SELECT
          r.id,
          r.comment,
          r.user_id,
          r.event_id,
          e.title AS event_title,
          r.is_suspended
        FROM review r
        INNER JOIN event e ON e.id = r.event_id
        WHERE r.id = ?
        LIMIT 1
        `,
        [report.review_id]
      );

      if (reviewRows.length === 0) {
        throw new Error(ERR_MSGS.REVIEW.REVIEW_NOT_FOUND);
      }

      const review = reviewRows[0];

      await connection.execute(
        `
        UPDATE review
        SET is_suspended = TRUE
        WHERE id = ?
        `,
        [review.id]
      );

      await connection.execute(
        `
        UPDATE report
        SET status = 'RESOLVED'
        WHERE id = ?
        `,
        [reportId]
      );

      await NotificationService.createNotification(
        connection,
        report.user_id,
        NOTIFICATION_MSGS.REPORT.RESOLVED_REVIEW(reportId, review.event_title)
      );

      await NotificationService.createNotification(
        connection,
        review.user_id,
        NOTIFICATION_MSGS.REVIEW.SUSPENDED(review.event_title)
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}