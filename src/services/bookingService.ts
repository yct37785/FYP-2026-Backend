import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { EventItem } from '@mytypes/event';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { NotificationService } from '@services/notificationService';
import { NOTIFICATION_MSGS } from '@const/notificationMessages';
import { EventService } from '@services/eventService';

export interface BookingStatusItem {
  isBooked: boolean;
  bookingId: number | null;
}

interface UserRow extends RowDataPacket {
  id: number;
  credits: number;
}

interface EventRow extends RowDataPacket {
  id: number;
  title: string;
  price: number;
  pax: number;
  is_suspended: number;
}

interface BookingCountRow extends RowDataPacket {
  count: number;
}

interface ExistingBookingRow extends RowDataPacket {
  id: number;
  event_id: number;
}

interface WaitlistPromotionCandidateRow extends RowDataPacket {
  waitlist_id: number;
  user_id: number;
  credits: number;
}

export class BookingService {
  private static async tryPromoteFirstWaitlistedUser(
    eventId: number,
    eventTitle: string,
    eventPrice: number,
    connection: Awaited<ReturnType<ReturnType<typeof Db.getPool>['getConnection']>>
  ): Promise<void> {
    const [candidateRows] = await connection.execute<WaitlistPromotionCandidateRow[]>(
      `
      SELECT
        w.id AS waitlist_id,
        u.id AS user_id,
        u.credits
      FROM waitlist w
      INNER JOIN users u ON u.id = w.user_id
      WHERE w.event_id = ?
        AND u.credits >= ?
      ORDER BY w.created_at ASC, w.id ASC
      LIMIT 1
      `,
      [eventId, eventPrice]
    );

    if (candidateRows.length === 0) {
      return;
    }

    const candidate = candidateRows[0];

    if (eventPrice > 0) {
      await connection.execute(
        `
        UPDATE users
        SET credits = credits - ?
        WHERE id = ?
        `,
        [eventPrice, candidate.user_id]
      );
    }

    await connection.execute(
      `
      INSERT INTO booking (user_id, event_id, credits_spent)
      VALUES (?, ?, ?)
      `,
      [candidate.user_id, eventId, eventPrice]
    );

    await connection.execute(
      `
      DELETE FROM waitlist
      WHERE id = ?
      `,
      [candidate.waitlist_id]
    );

    await NotificationService.createNotification(
      connection,
      candidate.user_id,
      NOTIFICATION_MSGS.BOOKING.PROMOTED_FROM_WAITLIST(eventTitle)
    );
  }

  static async createBooking(userId: number, eventId: number): Promise<EventItem> {
    const pool = Db.getPool();

    const [eventRows] = await pool.execute<EventRow[]>(
      `
      SELECT
        id,
        title,
        price,
        pax,
        is_suspended
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

    if (Boolean(event.is_suspended)) {
      throw new Error(ERR_MSGS.BOOKING.EVENT_SUSPENDED);
    }

    const [existingRows] = await pool.execute<ExistingBookingRow[]>(
      `
      SELECT id, event_id
      FROM booking
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (existingRows.length > 0) {
      throw new Error(ERR_MSGS.BOOKING.ALREADY_BOOKED);
    }

    const [countRows] = await pool.execute<BookingCountRow[]>(
      `
      SELECT COUNT(*) AS count
      FROM booking
      WHERE event_id = ?
      `,
      [eventId]
    );

    const confirmedCount = Number(countRows[0].count);

    if (confirmedCount >= event.pax) {
      throw new Error(ERR_MSGS.BOOKING.EVENT_FULL);
    }

    const [userRows] = await pool.execute<UserRow[]>(
      `
      SELECT id, credits
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (userRows.length === 0) {
      throw new Error(ERR_MSGS.AUTH.USER_NOT_FOUND);
    }

    const user = userRows[0];
    const eventPrice = Number(event.price);
    const userCredits = Number(user.credits);

    if (userCredits < eventPrice) {
      throw new Error(ERR_MSGS.BOOKING.INSUFFICIENT_CREDITS);
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (eventPrice > 0) {
        await connection.execute(
          `
          UPDATE users
          SET credits = credits - ?
          WHERE id = ?
          `,
          [eventPrice, userId]
        );
      }

      await connection.execute<ResultSetHeader>(
        `
        INSERT INTO booking (user_id, event_id, credits_spent)
        VALUES (?, ?, ?)
        `,
        [userId, eventId, eventPrice]
      );

      await NotificationService.createNotification(
        connection,
        userId,
        NOTIFICATION_MSGS.BOOKING.CONFIRMED(event.title)
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    return EventService.getEventById(eventId, {
      includeSuspended: true,
    });
  }

  static async getMyBookings(userId: number): Promise<EventItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ExistingBookingRow[]>(
      `
      SELECT
        b.id,
        b.event_id
      FROM booking b
      INNER JOIN event e ON e.id = b.event_id
      WHERE b.user_id = ?
      ORDER BY e.starts_at ASC, b.id ASC
      `,
      [userId]
    );

    const items = await Promise.all(
      rows.map((row) =>
        EventService.getEventById(row.event_id, {
          includeSuspended: true,
        })
      )
    );

    return items;
  }

  static async getMyBookingStatus(
    userId: number,
    eventId: number
  ): Promise<BookingStatusItem> {
    const pool = Db.getPool();

    await EventService.getEventById(eventId, {
      includeSuspended: true,
    });

    const [rows] = await pool.execute<ExistingBookingRow[]>(
      `
      SELECT id, event_id
      FROM booking
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (rows.length === 0) {
      return {
        isBooked: false,
        bookingId: null,
      };
    }

    return {
      isBooked: true,
      bookingId: rows[0].id,
    };
  }

  static async deleteMyBooking(userId: number, bookingId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<
      Array<
        ExistingBookingRow & {
          title: string;
          price: number;
          credits_spent: number;
        }
      >
    >(
      `
      SELECT
        b.id,
        b.event_id,
        b.credits_spent,
        e.title,
        e.price
      FROM booking b
      INNER JOIN event e ON e.id = b.event_id
      WHERE b.id = ? AND b.user_id = ?
      LIMIT 1
      `,
      [bookingId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.BOOKING.BOOKING_NOT_FOUND);
    }

    const booking = rows[0];
    const eventId = booking.event_id;
    const eventTitle = booking.title;
    const eventPrice = Number(booking.price);
    const creditsSpent = Number(booking.credits_spent);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      if (creditsSpent > 0) {
        await connection.execute(
          `
          UPDATE users
          SET credits = credits + ?
          WHERE id = ?
          `,
          [creditsSpent, userId]
        );
      }

      await connection.execute(
        `
        DELETE FROM booking
        WHERE id = ?
        `,
        [bookingId]
      );

      await NotificationService.createNotification(
        connection,
        userId,
        NOTIFICATION_MSGS.BOOKING.CANCELLED_REFUNDED(eventTitle, creditsSpent)
      );

      await BookingService.tryPromoteFirstWaitlistedUser(
        eventId,
        eventTitle,
        eventPrice,
        connection
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