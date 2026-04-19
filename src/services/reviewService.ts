import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { ReviewItem } from '@mytypes/review';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface EventRow extends RowDataPacket {
  id: number;
  source: 'INTERNAL' | 'EXTERNAL';
  ends_at: Date;
}

interface ExistingBookingRow extends RowDataPacket {
  id: number;
}

interface ExistingReviewRow extends RowDataPacket {
  id: number;
}

interface ReviewRow extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  event_id: number;
  event_title: string;
  rating: number;
  comment: string;
  is_suspended: number;
  created_at: Date;
  updated_at: Date;
}

const mapReviewRow = (row: ReviewRow): ReviewItem => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  eventId: row.event_id,
  eventTitle: row.event_title,
  rating: row.rating,
  comment: row.comment,
  isSuspended: Boolean(row.is_suspended),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class ReviewService {
  private static async validateReviewableEvent(
    userId: number,
    eventId: number
  ): Promise<void> {
    const pool = Db.getPool();

    const [eventRows] = await pool.execute<EventRow[]>(
      `
      SELECT id, source, ends_at
      FROM event
      WHERE id = ?
      LIMIT 1
      `,
      [eventId]
    );

    if (eventRows.length === 0) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_FOUND);
    }

    const event = eventRows[0];

    if (event.source === 'EXTERNAL') {
      throw new Error(ERR_MSGS.REVIEW.EXTERNAL_EVENT_NOT_REVIEWABLE);
    }

    if (new Date(event.ends_at) > new Date()) {
      throw new Error(ERR_MSGS.REVIEW.EVENT_NOT_ENDED);
    }

    const [bookingRows] = await pool.execute<ExistingBookingRow[]>(
      `
      SELECT id
      FROM booking
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (bookingRows.length === 0) {
      throw new Error(ERR_MSGS.REVIEW.BOOKING_REQUIRED);
    }
  }

  static async createReview(
    userId: number,
    eventId: number,
    rating: number,
    comment: string
  ): Promise<ReviewItem> {
    const pool = Db.getPool();

    await ReviewService.validateReviewableEvent(userId, eventId);

    const [existingRows] = await pool.execute<ExistingReviewRow[]>(
      `
      SELECT id
      FROM review
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (existingRows.length > 0) {
      throw new Error(ERR_MSGS.REVIEW.ALREADY_REVIEWED);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO review (user_id, event_id, rating, comment)
      VALUES (?, ?, ?, ?)
      `,
      [userId, eventId, rating, comment]
    );

    const [rows] = await pool.execute<ReviewRow[]>(
      `
      SELECT
        r.id,
        r.user_id,
        u.name AS user_name,
        r.event_id,
        e.title AS event_title,
        r.rating,
        r.comment,
        r.is_suspended,
        r.created_at,
        r.updated_at
      FROM review r
      INNER JOIN users u ON u.id = r.user_id
      INNER JOIN event e ON e.id = r.event_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapReviewRow(rows[0]);
  }

  static async getEventReviews(eventId: number): Promise<ReviewItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ReviewRow[]>(
      `
      SELECT
        r.id,
        r.user_id,
        u.name AS user_name,
        r.event_id,
        e.title AS event_title,
        r.rating,
        r.comment,
        r.is_suspended,
        r.created_at,
        r.updated_at
      FROM review r
      INNER JOIN users u ON u.id = r.user_id
      INNER JOIN event e ON e.id = r.event_id
      WHERE r.event_id = ?
        AND r.is_suspended = FALSE
      ORDER BY r.created_at DESC, r.id DESC
      `,
      [eventId]
    );

    return rows.map(mapReviewRow);
  }

  static async getMyReviews(userId: number): Promise<ReviewItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ReviewRow[]>(
      `
      SELECT
        r.id,
        r.user_id,
        u.name AS user_name,
        r.event_id,
        e.title AS event_title,
        r.rating,
        r.comment,
        r.is_suspended,
        r.created_at,
        r.updated_at
      FROM review r
      INNER JOIN users u ON u.id = r.user_id
      INNER JOIN event e ON e.id = r.event_id
      WHERE r.user_id = ?
      ORDER BY r.created_at DESC, r.id DESC
      `,
      [userId]
    );

    return rows.map(mapReviewRow);
  }

  static async getMyReviewById(userId: number, reviewId: number): Promise<ReviewItem> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ReviewRow[]>(
      `
      SELECT
        r.id,
        r.user_id,
        u.name AS user_name,
        r.event_id,
        e.title AS event_title,
        r.rating,
        r.comment,
        r.is_suspended,
        r.created_at,
        r.updated_at
      FROM review r
      INNER JOIN users u ON u.id = r.user_id
      INNER JOIN event e ON e.id = r.event_id
      WHERE r.id = ? AND r.user_id = ?
      LIMIT 1
      `,
      [reviewId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.REVIEW.REVIEW_NOT_FOUND);
    }

    return mapReviewRow(rows[0]);
  }

  static async updateMyReview(
    userId: number,
    reviewId: number,
    rating: number,
    comment: string
  ): Promise<ReviewItem> {
    const pool = Db.getPool();

    const [existingRows] = await pool.execute<ReviewRow[]>(
      `
      SELECT
        r.id,
        r.user_id,
        u.name AS user_name,
        r.event_id,
        e.title AS event_title,
        r.rating,
        r.comment,
        r.is_suspended,
        r.created_at,
        r.updated_at
      FROM review r
      INNER JOIN users u ON u.id = r.user_id
      INNER JOIN event e ON e.id = r.event_id
      WHERE r.id = ? AND r.user_id = ?
      LIMIT 1
      `,
      [reviewId, userId]
    );

    if (existingRows.length === 0) {
      throw new Error(ERR_MSGS.REVIEW.REVIEW_NOT_FOUND);
    }

    await pool.execute(
      `
      UPDATE review
      SET rating = ?, comment = ?
      WHERE id = ?
      `,
      [rating, comment, reviewId]
    );

    const [rows] = await pool.execute<ReviewRow[]>(
      `
      SELECT
        r.id,
        r.user_id,
        u.name AS user_name,
        r.event_id,
        e.title AS event_title,
        r.rating,
        r.comment,
        r.is_suspended,
        r.created_at,
        r.updated_at
      FROM review r
      INNER JOIN users u ON u.id = r.user_id
      INNER JOIN event e ON e.id = r.event_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [reviewId]
    );

    return mapReviewRow(rows[0]);
  }

  static async deleteMyReview(userId: number, reviewId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ExistingReviewRow[]>(
      `
      SELECT id
      FROM review
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [reviewId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.REVIEW.REVIEW_NOT_FOUND);
    }

    await pool.execute(
      `
      DELETE FROM review
      WHERE id = ?
      `,
      [reviewId]
    );
  }
}