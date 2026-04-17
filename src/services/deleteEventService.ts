import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import { RowDataPacket } from 'mysql2/promise';

interface EventOwnerRow extends RowDataPacket {
  id: number;
  owner_id: number;
}

interface BookingRefundRow extends RowDataPacket {
  id: number;
  user_id: number;
  credits_spent: number;
}

export class DeleteEventService {
  static async deleteMyEvent(eventId: number, ownerId: number): Promise<void> {
    const pool = Db.getPool();

    const [eventRows] = await pool.execute<EventOwnerRow[]>(
      `
      SELECT id, owner_id
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
      }

      await connection.execute(
        `
        DELETE FROM booking
        WHERE event_id = ?
        `,
        [eventId]
      );

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