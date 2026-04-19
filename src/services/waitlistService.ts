import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { EventItem } from '@mytypes/event';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { NotificationService } from '@services/notificationService';
import { NOTIFICATION_MSGS } from '@const/notificationMessages';
import { EventService } from '@services/eventService';

export interface WaitlistStatusItem {
  isWaitlisted: boolean;
  waitlistId: number | null;
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

interface ExistingRow extends RowDataPacket {
  id: number;
  event_id: number;
}

export class WaitlistService {
  static async createWaitlist(userId: number, eventId: number): Promise<EventItem> {
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

    const [existingBookingRows] = await pool.execute<ExistingRow[]>(
      `
      SELECT id, event_id
      FROM booking
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (existingBookingRows.length > 0) {
      throw new Error(ERR_MSGS.BOOKING.ALREADY_BOOKED);
    }

    const [existingWaitlistRows] = await pool.execute<ExistingRow[]>(
      `
      SELECT id, event_id
      FROM waitlist
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (existingWaitlistRows.length > 0) {
      throw new Error(ERR_MSGS.WAITLIST.ALREADY_WAITLISTED);
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

    if (confirmedCount < event.pax) {
      throw new Error(ERR_MSGS.WAITLIST.EVENT_HAS_SPACE);
    }

    await pool.execute<ResultSetHeader>(
      `
      INSERT INTO waitlist (user_id, event_id)
      VALUES (?, ?)
      `,
      [userId, eventId]
    );

    await NotificationService.createNotification(
      pool,
      userId,
      NOTIFICATION_MSGS.WAITLIST.JOINED(event.title)
    );

    return EventService.getEventById(eventId, {
      includeSuspended: true,
    });
  }

  static async getMyWaitlists(userId: number): Promise<EventItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ExistingRow[]>(
      `
      SELECT
        w.id,
        w.event_id
      FROM waitlist w
      INNER JOIN event e ON e.id = w.event_id
      WHERE w.user_id = ?
      ORDER BY e.starts_at ASC, w.id ASC
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

  static async getMyWaitlistStatus(
    userId: number,
    eventId: number
  ): Promise<WaitlistStatusItem> {
    const pool = Db.getPool();

    await EventService.getEventById(eventId, {
      includeSuspended: true,
    });

    const [rows] = await pool.execute<ExistingRow[]>(
      `
      SELECT id, event_id
      FROM waitlist
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (rows.length === 0) {
      return {
        isWaitlisted: false,
        waitlistId: null,
      };
    }

    return {
      isWaitlisted: true,
      waitlistId: rows[0].id,
    };
  }

  static async deleteMyWaitlist(userId: number, waitlistId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ExistingRow[]>(
      `
      SELECT id, event_id
      FROM waitlist
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [waitlistId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.WAITLIST.WAITLIST_NOT_FOUND);
    }

    await pool.execute(
      `
      DELETE FROM waitlist
      WHERE id = ?
      `,
      [waitlistId]
    );
  }
}