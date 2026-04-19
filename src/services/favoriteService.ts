import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { EventItem } from '@mytypes/event';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { EventService } from '@services/eventService';

interface ExistingFavoriteRow extends RowDataPacket {
  id: number;
}

interface FavoriteEventRow extends RowDataPacket {
  id: number;
  event_id: number;
}

export interface FavoriteStatusItem {
  isFavorited: boolean;
  favoriteId: number | null;
}

export class FavoriteService {
  static async createFavorite(userId: number, eventId: number): Promise<EventItem> {
    const pool = Db.getPool();

    await EventService.getEventById(eventId);

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

    await pool.execute<ResultSetHeader>(
      `
      INSERT INTO favorite (user_id, event_id)
      VALUES (?, ?)
      `,
      [userId, eventId]
    );

    return EventService.getEventById(eventId);
  }

  static async getMyFavoriteStatus(
    userId: number,
    eventId: number
  ): Promise<FavoriteStatusItem> {
    const pool = Db.getPool();

    await EventService.getEventById(eventId);

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
      return {
        isFavorited: false,
        favoriteId: null,
      };
    }

    return {
      isFavorited: true,
      favoriteId: rows[0].id,
    };
  }

  static async getMyFavorites(userId: number): Promise<EventItem[]> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<FavoriteEventRow[]>(
      `
      SELECT
        id,
        event_id
      FROM favorite
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
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
}