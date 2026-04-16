import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { BookingItem } from '@mytypes/booking';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';

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
  starts_at: Date;
  ends_at: Date;
  venue: string;
  city: string;
}

interface BookingCountRow extends RowDataPacket {
  count: number;
}

interface ExistingBookingRow extends RowDataPacket {
  id: number;
}

interface BookingRow extends RowDataPacket {
  id: number;
  user_id: number;
  event_id: number;
  event_title: string;
  event_price: number;
  credits_spent: number;
  event_starts_at: Date;
  event_ends_at: Date;
  event_venue: string;
  event_city: string;
  created_at: Date;
  updated_at: Date;
}

interface WaitlistPromotionRow extends RowDataPacket {
  id: number;
  user_id: number;
  event_id: number;
  created_at: Date;
}

const mapBookingRow = (row: BookingRow): BookingItem => ({
  id: row.id,
  userId: row.user_id,
  eventId: row.event_id,
  eventTitle: row.event_title,
  eventPrice: Number(row.event_price),
  creditsSpent: Number(row.credits_spent),
  eventStartsAt: row.event_starts_at,
  eventEndsAt: row.event_ends_at,
  eventVenue: row.event_venue,
  eventCity: row.event_city,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class BookingService {
  private static async tryPromoteFirstWaitlistedUser(
    eventId: number,
    eventPrice: number,
    connection: Awaited<ReturnType<ReturnType<typeof Db.getPool>['getConnection']>>
  ): Promise<void> {
    const [waitlistRows] = await connection.execute<WaitlistPromotionRow[]>(
      `
      SELECT
        id,
        user_id,
        event_id,
        created_at
      FROM waitlist
      WHERE event_id = ?
      ORDER BY created_at ASC, id ASC
      LIMIT 1
      `,
      [eventId]
    );

    if (waitlistRows.length === 0) {
      return;
    }

    const waitlistEntry = waitlistRows[0];
    const promotedUserId = waitlistEntry.user_id;

    const [promotedUserRows] = await connection.execute<UserRow[]>(
      `
      SELECT id, credits
      FROM users
      WHERE id = ?
      LIMIT 1
      `,
      [promotedUserId]
    );

    if (promotedUserRows.length === 0) {
      return;
    }

    const promotedUser = promotedUserRows[0];
    const promotedUserCredits = Number(promotedUser.credits);

    if (promotedUserCredits < eventPrice) {
      return;
    }

    if (eventPrice > 0) {
      await connection.execute(
        `
        UPDATE users
        SET credits = credits - ?
        WHERE id = ?
        `,
        [eventPrice, promotedUserId]
      );
    }

    await connection.execute(
      `
      INSERT INTO booking (user_id, event_id, credits_spent)
      VALUES (?, ?, ?)
      `,
      [promotedUserId, eventId, eventPrice]
    );

    await connection.execute(
      `
      DELETE FROM waitlist
      WHERE id = ?
      `,
      [waitlistEntry.id]
    );
  }

  static async createBooking(userId: number, eventId: number): Promise<BookingItem> {
    const pool = Db.getPool();

    const [eventRows] = await pool.execute<EventRow[]>(
      `
      SELECT
        id,
        title,
        price,
        pax,
        is_suspended,
        starts_at,
        ends_at,
        venue,
        city
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
      SELECT id
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

      const [result] = await connection.execute<ResultSetHeader>(
        `
        INSERT INTO booking (user_id, event_id, credits_spent)
        VALUES (?, ?, ?)
        `,
        [userId, eventId, eventPrice]
      );

      await connection.commit();

      const [bookingRows] = await pool.execute<BookingRow[]>(
        `
        SELECT
          b.id,
          b.user_id,
          b.event_id,
          e.title AS event_title,
          e.price AS event_price,
          b.credits_spent,
          e.starts_at AS event_starts_at,
          e.ends_at AS event_ends_at,
          e.venue AS event_venue,
          e.city AS event_city,
          b.created_at,
          b.updated_at
        FROM booking b
        INNER JOIN event e ON e.id = b.event_id
        WHERE b.id = ?
        LIMIT 1
        `,
        [result.insertId]
      );

      return mapBookingRow(bookingRows[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getMyBookings(userId: number): Promise<BookingItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<BookingRow[]>(
      `
      SELECT
        b.id,
        b.user_id,
        b.event_id,
        e.title AS event_title,
        e.price AS event_price,
        b.credits_spent,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.venue AS event_venue,
        e.city AS event_city,
        b.created_at,
        b.updated_at
      FROM booking b
      INNER JOIN event e ON e.id = b.event_id
      WHERE b.user_id = ?
      ORDER BY e.starts_at ASC, b.id ASC
      `,
      [userId]
    );

    return rows.map(mapBookingRow);
  }

  static async getMyBookingById(userId: number, bookingId: number): Promise<BookingItem> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<BookingRow[]>(
      `
      SELECT
        b.id,
        b.user_id,
        b.event_id,
        e.title AS event_title,
        e.price AS event_price,
        b.credits_spent,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.venue AS event_venue,
        e.city AS event_city,
        b.created_at,
        b.updated_at
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

    return mapBookingRow(rows[0]);
  }

  static async deleteMyBooking(userId: number, bookingId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<BookingRow[]>(
      `
      SELECT
        b.id,
        b.user_id,
        b.event_id,
        e.title AS event_title,
        e.price AS event_price,
        b.credits_spent,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.venue AS event_venue,
        e.city AS event_city,
        b.created_at,
        b.updated_at
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
    const eventPrice = Number(booking.event_price);
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

      await BookingService.tryPromoteFirstWaitlistedUser(
        eventId,
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