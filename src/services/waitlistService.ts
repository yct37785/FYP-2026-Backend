import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { WaitlistItem } from '@mytypes/waitlist';
import { RowDataPacket } from 'mysql2';

interface WaitlistRow extends RowDataPacket {
  id: number;
  user_id: number;
  event_id: number;
  event_title: string;
  event_price: number;
  event_starts_at: Date;
  event_ends_at: Date;
  event_venue: string;
  event_city: string;
  created_at: Date;
  updated_at: Date;
}

const mapWaitlistRow = (row: WaitlistRow): WaitlistItem => ({
  id: row.id,
  userId: row.user_id,
  eventId: row.event_id,
  eventTitle: row.event_title,
  eventPrice: Number(row.event_price),
  eventStartsAt: row.event_starts_at,
  eventEndsAt: row.event_ends_at,
  eventVenue: row.event_venue,
  eventCity: row.event_city,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class WaitlistService {
  static async getMyWaitlists(userId: number): Promise<WaitlistItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<WaitlistRow[]>(
      `
      SELECT
        w.id,
        w.user_id,
        w.event_id,
        e.title AS event_title,
        e.price AS event_price,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.venue AS event_venue,
        e.city AS event_city,
        w.created_at,
        w.updated_at
      FROM waitlist w
      INNER JOIN event e ON e.id = w.event_id
      WHERE w.user_id = ?
      ORDER BY e.starts_at ASC, w.id ASC
      `,
      [userId]
    );

    return rows.map(mapWaitlistRow);
  }

  static async getMyWaitlistById(userId: number, waitlistId: number): Promise<WaitlistItem> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<WaitlistRow[]>(
      `
      SELECT
        w.id,
        w.user_id,
        w.event_id,
        e.title AS event_title,
        e.price AS event_price,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.venue AS event_venue,
        e.city AS event_city,
        w.created_at,
        w.updated_at
      FROM waitlist w
      INNER JOIN event e ON e.id = w.event_id
      WHERE w.id = ? AND w.user_id = ?
      LIMIT 1
      `,
      [waitlistId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.WAITLIST.WAITLIST_NOT_FOUND);
    }

    return mapWaitlistRow(rows[0]);
  }

  static async deleteMyWaitlist(userId: number, waitlistId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<RowDataPacket[]>(
      `
      SELECT id
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