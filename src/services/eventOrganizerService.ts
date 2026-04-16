import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export interface EventBookingItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  creditsSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventWaitlistItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  createdAt: Date;
  updatedAt: Date;
}

interface EventOwnerRow extends RowDataPacket {
  id: number;
  owner_id: number;
}

interface EventBookingRow extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  credits_spent: number;
  created_at: Date;
  updated_at: Date;
}

interface EventWaitlistRow extends RowDataPacket {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  created_at: Date;
  updated_at: Date;
}

const mapEventBookingRow = (row: EventBookingRow): EventBookingItem => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  userEmail: row.user_email,
  creditsSpent: Number(row.credits_spent),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapEventWaitlistRow = (row: EventWaitlistRow): EventWaitlistItem => ({
  id: row.id,
  userId: row.user_id,
  userName: row.user_name,
  userEmail: row.user_email,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class EventOrganizerService {
  private static async getOwnedEventOrThrow(
    eventId: number,
    ownerId: number
  ): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<EventOwnerRow[]>(
      `
      SELECT id, owner_id
      FROM event
      WHERE id = ?
      LIMIT 1
      `,
      [eventId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_FOUND);
    }

    if (rows[0].owner_id !== ownerId) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_OWNER);
    }
  }

  static async getMyEventBookings(
    eventId: number,
    ownerId: number
  ): Promise<EventBookingItem[]> {
    const pool = Db.getPool();

    await EventOrganizerService.getOwnedEventOrThrow(eventId, ownerId);

    const [rows] = await pool.execute<EventBookingRow[]>(
      `
      SELECT
        b.id,
        b.user_id,
        u.name AS user_name,
        u.email AS user_email,
        b.credits_spent,
        b.created_at,
        b.updated_at
      FROM booking b
      INNER JOIN users u ON u.id = b.user_id
      WHERE b.event_id = ?
      ORDER BY b.created_at ASC, b.id ASC
      `,
      [eventId]
    );

    return rows.map(mapEventBookingRow);
  }

  static async getMyEventWaitlists(
    eventId: number,
    ownerId: number
  ): Promise<EventWaitlistItem[]> {
    const pool = Db.getPool();

    await EventOrganizerService.getOwnedEventOrThrow(eventId, ownerId);

    const [rows] = await pool.execute<EventWaitlistRow[]>(
      `
      SELECT
        w.id,
        w.user_id,
        u.name AS user_name,
        u.email AS user_email,
        w.created_at,
        w.updated_at
      FROM waitlist w
      INNER JOIN users u ON u.id = w.user_id
      WHERE w.event_id = ?
      ORDER BY w.created_at ASC, w.id ASC
      `,
      [eventId]
    );

    return rows.map(mapEventWaitlistRow);
  }
}