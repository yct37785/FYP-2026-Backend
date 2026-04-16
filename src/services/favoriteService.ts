import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { FavoriteItem } from '@mytypes/favorite';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface EventRow extends RowDataPacket {
  id: number;
  title: string;
  price: number;
  is_suspended: number;
  starts_at: Date;
  ends_at: Date;
  venue: string;
  city: string;
}

interface ExistingFavoriteRow extends RowDataPacket {
  id: number;
}

interface FavoriteRow extends RowDataPacket {
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

const mapFavoriteRow = (row: FavoriteRow): FavoriteItem => ({
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

export class FavoriteService {
  static async createFavorite(userId: number, eventId: number): Promise<FavoriteItem> {
    const pool = Db.getPool();

    const [eventRows] = await pool.execute<EventRow[]>(
      `
      SELECT
        id,
        title,
        price,
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

    if (Boolean(eventRows[0].is_suspended)) {
      throw new Error(ERR_MSGS.FAVORITE.EVENT_SUSPENDED);
    }

    const [existingRows] = await pool.execute<ExistingFavoriteRow[]>(
      `
      SELECT id
      FROM favorite
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (existingRows.length > 0) {
      throw new Error(ERR_MSGS.FAVORITE.ALREADY_FAVORITED);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO favorite (user_id, event_id)
      VALUES (?, ?)
      `,
      [userId, eventId]
    );

    const [rows] = await pool.execute<FavoriteRow[]>(
      `
      SELECT
        f.id,
        f.user_id,
        f.event_id,
        e.title AS event_title,
        e.price AS event_price,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.venue AS event_venue,
        e.city AS event_city,
        f.created_at,
        f.updated_at
      FROM favorite f
      INNER JOIN event e ON e.id = f.event_id
      WHERE f.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapFavoriteRow(rows[0]);
  }

  static async getMyFavorites(userId: number): Promise<FavoriteItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<FavoriteRow[]>(
      `
      SELECT
        f.id,
        f.user_id,
        f.event_id,
        e.title AS event_title,
        e.price AS event_price,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.venue AS event_venue,
        e.city AS event_city,
        f.created_at,
        f.updated_at
      FROM favorite f
      INNER JOIN event e ON e.id = f.event_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC, f.id DESC
      `,
      [userId]
    );

    return rows.map(mapFavoriteRow);
  }

  static async getMyFavoriteById(userId: number, favoriteId: number): Promise<FavoriteItem> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<FavoriteRow[]>(
      `
      SELECT
        f.id,
        f.user_id,
        f.event_id,
        e.title AS event_title,
        e.price AS event_price,
        e.starts_at AS event_starts_at,
        e.ends_at AS event_ends_at,
        e.venue AS event_venue,
        e.city AS event_city,
        f.created_at,
        f.updated_at
      FROM favorite f
      INNER JOIN event e ON e.id = f.event_id
      WHERE f.id = ? AND f.user_id = ?
      LIMIT 1
      `,
      [favoriteId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.FAVORITE.FAVORITE_NOT_FOUND);
    }

    return mapFavoriteRow(rows[0]);
  }

  static async deleteMyFavorite(userId: number, favoriteId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ExistingFavoriteRow[]>(
      `
      SELECT id
      FROM favorite
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [favoriteId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.FAVORITE.FAVORITE_NOT_FOUND);
    }

    await pool.execute(
      `
      DELETE FROM favorite
      WHERE id = ?
      `,
      [favoriteId]
    );
  }

  static async deleteMyFavoriteByEventId(userId: number, eventId: number): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ExistingFavoriteRow[]>(
      `
      SELECT id
      FROM favorite
      WHERE user_id = ? AND event_id = ?
      LIMIT 1
      `,
      [userId, eventId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.FAVORITE.FAVORITE_NOT_FOUND);
    }

    await pool.execute(
      `
      DELETE FROM favorite
      WHERE user_id = ? AND event_id = ?
      `,
      [userId, eventId]
    );
  }
}