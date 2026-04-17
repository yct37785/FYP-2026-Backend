import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { NotificationItem } from '@mytypes/notification';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface NotificationRow extends RowDataPacket {
  id: number;
  user_id: number;
  message: string;
  created_at: Date;
  updated_at: Date;
}

interface ExistingNotificationRow extends RowDataPacket {
  id: number;
}

const mapNotificationRow = (row: NotificationRow): NotificationItem => ({
  id: row.id,
  userId: row.user_id,
  message: row.message,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class NotificationService {
  static async createNotification(
    userId: number,
    message: string
  ): Promise<NotificationItem> {
    const pool = Db.getPool();

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO notification (user_id, message)
      VALUES (?, ?)
      `,
      [userId, message]
    );

    const [rows] = await pool.execute<NotificationRow[]>(
      `
      SELECT
        id,
        user_id,
        message,
        created_at,
        updated_at
      FROM notification
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapNotificationRow(rows[0]);
  }

  static async getMyNotifications(
    userId: number,
    from?: Date
  ): Promise<NotificationItem[]> {
    const pool = Db.getPool();

    if (from) {
      const [rows] = await pool.execute<NotificationRow[]>(
        `
        SELECT
          id,
          user_id,
          message,
          created_at,
          updated_at
        FROM notification
        WHERE user_id = ?
          AND created_at > ?
        ORDER BY created_at ASC, id ASC
        `,
        [userId, from]
      );

      return rows.map(mapNotificationRow);
    }

    const [rows] = await pool.execute<NotificationRow[]>(
      `
      SELECT
        id,
        user_id,
        message,
        created_at,
        updated_at
      FROM notification
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [userId]
    );

    return rows.map(mapNotificationRow);
  }

  static async deleteMyNotification(
    userId: number,
    notificationId: number
  ): Promise<void> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<ExistingNotificationRow[]>(
      `
      SELECT id
      FROM notification
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [notificationId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.NOTIFICATION.NOTIFICATION_NOT_FOUND);
    }

    await pool.execute(
      `
      DELETE FROM notification
      WHERE id = ?
      `,
      [notificationId]
    );
  }
}