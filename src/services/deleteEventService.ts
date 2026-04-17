import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import { RowDataPacket } from 'mysql2/promise';
import { NotificationService } from '@services/notificationService';
import { NOTIFICATION_MSGS } from '@const/notificationMessages';

interface EventOwnerRow extends RowDataPacket {
  id: number;
  owner_id: number;
  title: string;
}

interface BookingRefundRow extends RowDataPacket {
  id: number;
  user_id: number;
  credits_spent: number;
}

interface WaitlistUserRow extends RowDataPacket {
  id: number;
  user_id: number;
}

export class DeleteEventService {
  static async deleteMyEvent(eventId: number, ownerId: number): Promise<void> {
    const pool = Db.getPool();

    const [eventRows] = await pool.execute<EventOwnerRow[]>(
      `
      SELECT id, owner_id, title
      FROM event
      WHERE id = ?
      LIMIT 1
      `,
      [eventId]
    );

    if (eventRows.length === 0) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_FOUND);
    }

    if (eventRows[0].owner_id !== ownerId) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_OWNER);
    }

    const eventTitle = eventRows[0].title;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [bookingRows] = await connection.execute<BookingRefundRow[]>(
        `
        SELECT
          id,
          user_id,
          credits_spent
        FROM booking
        WHERE event_id = ?
        `,
        [eventId]
      );

      for (const booking of bookingRows) {
        const creditsSpent = Number(booking.credits_spent);

        if (creditsSpent > 0) {
          await connection.execute(
            `
            UPDATE users
            SET credits = credits + ?
            WHERE id = ?
            `,
            [creditsSpent, booking.user_id]
          );
        }

        await NotificationService.createNotification(
          connection,
          booking.user_id,
          NOTIFICATION_MSGS.BOOKING.CANCELLED_REFUNDED(eventTitle, creditsSpent)
        );
      }

      await connection.execute(
        `
        DELETE FROM booking
        WHERE event_id = ?
        `,
        [eventId]
      );

      const [waitlistRows] = await connection.execute<WaitlistUserRow[]>(
        `
        SELECT
          id,
          user_id
        FROM waitlist
        WHERE event_id = ?
        `,
        [eventId]
      );

      for (const waitlist of waitlistRows) {
        await NotificationService.createNotification(
          connection,
          waitlist.user_id,
          NOTIFICATION_MSGS.WAITLIST.REMOVED(eventTitle)
        );
      }

      await connection.execute(
        `
        DELETE FROM waitlist
        WHERE event_id = ?
        `,
        [eventId]
      );

      await connection.execute(
        `
        DELETE FROM favorite
        WHERE event_id = ?
        `,
        [eventId]
      );

      await connection.execute(
        `
        DELETE FROM event
        WHERE id = ?
        `,
        [eventId]
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