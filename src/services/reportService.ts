import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { ReportItem, ReportStatus } from '@mytypes/report';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface ExistingEventRow extends RowDataPacket {
  id: number;
}

interface ExistingReviewRow extends RowDataPacket {
  id: number;
}

interface ReportRow extends RowDataPacket {
  id: number;
  user_id: number;
  event_id: number | null;
  event_title: string | null;
  review_id: number | null;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: Date;
  updated_at: Date;
}

interface ExistingReportRow extends RowDataPacket {
  id: number;
}

const mapReportRow = (row: ReportRow): ReportItem => ({
  id: row.id,
  userId: row.user_id,
  eventId: row.event_id,
  eventTitle: row.event_title,
  reviewId: row.review_id,
  reason: row.reason,
  details: row.details,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const REPORT_SELECT = `
  SELECT
    r.id,
    r.user_id,
    r.event_id,
    e.title AS event_title,
    r.review_id,
    r.reason,
    r.details,
    r.status,
    r.created_at,
    r.updated_at
  FROM report r
  LEFT JOIN event e ON e.id = r.event_id
`;

export class ReportService {
  static async createEventReport(
    userId: number,
    eventId: number,
    reason: string,
    details?: string | null
  ): Promise<ReportItem> {
    const pool = Db.getPool();

    const [eventRows] = await pool.execute<ExistingEventRow[]>(
      `
      SELECT id
      FROM event
      WHERE id = ?
      LIMIT 1
      `,
      [eventId]
    );

    if (eventRows.length === 0) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_FOUND);
    }

    const [existingRows] = await pool.execute<ExistingReportRow[]>(
      `
      SELECT id
      FROM report
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (existingRows.length > 0) {
      throw new Error(ERR_MSGS.REPORT.ALREADY_REPORTED);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO report (user_id, event_id, review_id, reason, details)
      VALUES (?, ?, NULL, ?, ?)
      `,
      [userId, eventId, reason, details ?? null]
    );

    const [rows] = await pool.execute<ReportRow[]>(
      `
      ${REPORT_SELECT}
      WHERE r.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapReportRow(rows[0]);
  }

  static async createReviewReport(
    userId: number,
    reviewId: number,
    reason: string,
    details?: string | null
  ): Promise<ReportItem> {
    const pool = Db.getPool();

    const [reviewRows] = await pool.execute<ExistingReviewRow[]>(
      `
      SELECT id
      FROM review
      WHERE id = ?
      LIMIT 1
      `,
      [reviewId]
    );

    if (reviewRows.length === 0) {
      throw new Error(ERR_MSGS.REVIEW.REVIEW_NOT_FOUND);
    }

    const [existingRows] = await pool.execute<ExistingReportRow[]>(
      `
      SELECT id
      FROM report
      WHERE user_id = ? AND review_id = ?
      LIMIT 1
      `,
      [userId, reviewId]
    );

    if (existingRows.length > 0) {
      throw new Error(ERR_MSGS.REPORT.ALREADY_REPORTED);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO report (user_id, event_id, review_id, reason, details)
      VALUES (?, NULL, ?, ?, ?)
      `,
      [userId, reviewId, reason, details ?? null]
    );

    const [rows] = await pool.execute<ReportRow[]>(
      `
      ${REPORT_SELECT}
      WHERE r.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapReportRow(rows[0]);
  }

  static async getMyReports(userId: number): Promise<ReportItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ReportRow[]>(
      `
      ${REPORT_SELECT}
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC, r.id DESC
      `,
      [userId]
    );

    return rows.map(mapReportRow);
  }

  static async getMyReportById(
    userId: number,
    reportId: number
  ): Promise<ReportItem> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ReportRow[]>(
      `
      ${REPORT_SELECT}
      WHERE r.id = ? AND r.user_id = ?
      LIMIT 1
      `,
      [reportId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.REPORT.REPORT_NOT_FOUND);
    }

    return mapReportRow(rows[0]);
  }

  static async updateMyReport(
    userId: number,
    reportId: number,
    reason: string,
    details?: string | null
  ): Promise<ReportItem> {
    const pool = Db.getPool();

    const [existingRows] = await pool.execute<ExistingReportRow[]>(
      `
      SELECT id
      FROM report
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [reportId, userId]
    );

    if (existingRows.length === 0) {
      throw new Error(ERR_MSGS.REPORT.REPORT_NOT_FOUND);
    }

    await pool.execute(
      `
      UPDATE report
      SET reason = ?, details = ?
      WHERE id = ?
      `,
      [reason, details ?? null, reportId]
    );

    const [rows] = await pool.execute<ReportRow[]>(
      `
      ${REPORT_SELECT}
      WHERE r.id = ?
      LIMIT 1
      `,
      [reportId]
    );

    return mapReportRow(rows[0]);
  }

  static async deleteMyReport(userId: number, reportId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ExistingReportRow[]>(
      `
      SELECT id
      FROM report
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [reportId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.REPORT.REPORT_NOT_FOUND);
    }

    await pool.execute(
      `
      DELETE FROM report
      WHERE id = ?
      `,
      [reportId]
    );
  }
}