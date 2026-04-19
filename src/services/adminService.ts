import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import { NOTIFICATION_MSGS } from '@const/notificationMessages';
import { NotificationService } from '@services/notificationService';
import { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { ReportStatus } from '@mytypes/report';

export interface AdminReportItem {
  id: number;
  userId: number;
  reporterName: string;
  reporterEmail: string;
  eventId: number | null;
  eventTitle: string | null;
  reviewId: number | null;
  reviewComment: string | null;
  reviewRating: number | null;
  reviewIsSuspended: boolean | null;
  reviewAuthorId: number | null;
  reviewAuthorName: string | null;
  reviewEventId: number | null;
  reviewEventTitle: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface ReportRow extends RowDataPacket {
  id: number;
  user_id: number;
  event_id: number | null;
  review_id: number | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
}

interface AdminReportRow extends RowDataPacket {
  id: number;
  user_id: number;
  reporter_name: string;
  reporter_email: string;
  event_id: number | null;
  event_title: string | null;
  review_id: number | null;
  review_comment: string | null;
  review_rating: number | null;
  review_is_suspended: number | null;
  review_author_id: number | null;
  review_author_name: string | null;
  review_event_id: number | null;
  review_event_title: string | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: Date;
  updated_at: Date;
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

const mapAdminReportRow = (row: AdminReportRow): AdminReportItem => ({
  id: row.id,
  userId: row.user_id,
  reporterName: row.reporter_name,
  reporterEmail: row.reporter_email,
  eventId: row.event_id,
  eventTitle: row.event_title,
  reviewId: row.review_id,
  reviewComment: row.review_comment,
  reviewRating: row.review_rating !== null ? Number(row.review_rating) : null,
  reviewIsSuspended:
    row.review_is_suspended !== null ? Boolean(row.review_is_suspended) : null,
  reviewAuthorId: row.review_author_id,
  reviewAuthorName: row.review_author_name,
  reviewEventId: row.review_event_id,
  reviewEventTitle: row.review_event_title,
  reason: row.reason,
  details: row.details,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

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

  static async getAllReports(): Promise<AdminReportItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<AdminReportRow[]>(
      `
      SELECT
        r.id,
        r.user_id,
        reporter.name AS reporter_name,
        reporter.email AS reporter_email,
        r.event_id,
        event_target.title AS event_title,
        r.review_id,
        review_target.comment AS review_comment,
        review_target.rating AS review_rating,
        review_target.is_suspended AS review_is_suspended,
        review_author.id AS review_author_id,
        review_author.name AS review_author_name,
        review_target.event_id AS review_event_id,
        review_event.title AS review_event_title,
        r.reason,
        r.details,
        r.status,
        r.created_at,
        r.updated_at
      FROM report r
      INNER JOIN users reporter ON reporter.id = r.user_id
      LEFT JOIN event event_target ON event_target.id = r.event_id
      LEFT JOIN review review_target ON review_target.id = r.review_id
      LEFT JOIN users review_author ON review_author.id = review_target.user_id
      LEFT JOIN event review_event ON review_event.id = review_target.event_id
      ORDER BY
        CASE r.status
          WHEN 'OPEN' THEN 0
          WHEN 'RESOLVED' THEN 1
          WHEN 'DISMISSED' THEN 2
          ELSE 3
        END ASC,
        r.created_at DESC,
        r.id DESC
      `
    );

    return rows.map(mapAdminReportRow);
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