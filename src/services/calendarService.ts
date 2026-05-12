import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { RowDataPacket } from 'mysql2';
import { Db } from '@config/db';
import { env } from '@config/env';
import { ERR_MSGS } from '@const/errorMessages';
import type {
  BookingCalendarSyncItem,
  CalendarConnectionStatus,
  CalendarSyncStatus,
} from '@mytypes/calendar';

const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
];

interface CalendarStatePayload {
  userId: number;
}

interface CalendarConnectionRow extends RowDataPacket {
  user_id: number;
  access_token: string | null;
  refresh_token: string | null;
  scope: string | null;
  token_type: string | null;
  expiry_date: number | null;
  updated_at: Date;
}

interface BookingForSyncRow extends RowDataPacket {
  booking_id: number;
  user_id: number;
  event_id: number;
  title: string;
  description: string;
  venue: string;
  address: string;
  city: string;
  starts_at: Date;
  ends_at: Date;
}

interface BookingSyncRow extends RowDataPacket {
  booking_id: number;
  event_id: number;
  google_event_id: string | null;
  status: CalendarSyncStatus;
  last_error: string | null;
  synced_at: Date | null;
}

const mapSyncRow = (row: BookingSyncRow): BookingCalendarSyncItem => ({
  bookingId: row.booking_id,
  eventId: row.event_id,
  googleEventId: row.google_event_id,
  status: row.status,
  lastError: row.last_error,
  syncedAt: row.synced_at,
});

export class CalendarService {
  private static ensureGoogleConfigured() {
    if (!env.googleClientId || !env.googleClientSecret || !env.googleRedirectUri) {
      throw new Error(ERR_MSGS.CALENDAR.GOOGLE_NOT_CONFIGURED);
    }
  }

  private static createOAuthClient() {
    CalendarService.ensureGoogleConfigured();
    return new google.auth.OAuth2(
      env.googleClientId,
      env.googleClientSecret,
      env.googleRedirectUri
    );
  }

  private static createState(userId: number): string {
    return jwt.sign({ userId }, env.jwtSecret, {
      expiresIn: '10m',
    });
  }

  private static verifyState(state: string): CalendarStatePayload {
    return jwt.verify(state, env.jwtSecret) as CalendarStatePayload;
  }

  static getGoogleAuthUrl(userId: number): string {
    const oauth2Client = CalendarService.createOAuthClient();

    return oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_CALENDAR_SCOPES,
      state: CalendarService.createState(userId),
    });
  }

  static async handleGoogleCallback(code: string, state: string): Promise<void> {
    const { userId } = CalendarService.verifyState(state);
    const oauth2Client = CalendarService.createOAuthClient();
    const pool = Db.getPool();

    const { tokens } = await oauth2Client.getToken(code);

    const [existingRows] = await pool.execute<CalendarConnectionRow[]>(
      `
      SELECT refresh_token
      FROM google_calendar_connection
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    const refreshToken =
      tokens.refresh_token ?? existingRows[0]?.refresh_token ?? null;

    await pool.execute(
      `
      INSERT INTO google_calendar_connection (
        user_id,
        access_token,
        refresh_token,
        scope,
        token_type,
        expiry_date
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        access_token = VALUES(access_token),
        refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
        scope = VALUES(scope),
        token_type = VALUES(token_type),
        expiry_date = VALUES(expiry_date)
      `,
      [
        userId,
        tokens.access_token ?? null,
        refreshToken,
        tokens.scope ?? null,
        tokens.token_type ?? null,
        tokens.expiry_date ?? null,
      ]
    );
  }

  static async getConnectionStatus(
    userId: number
  ): Promise<CalendarConnectionStatus> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<CalendarConnectionRow[]>(
      `
      SELECT user_id, updated_at
      FROM google_calendar_connection
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return {
        connected: false,
        updatedAt: null,
      };
    }

    return {
      connected: true,
      updatedAt: rows[0].updated_at,
    };
  }

  static async disconnect(userId: number): Promise<void> {
    const pool = Db.getPool();

    await pool.execute(
      `
      DELETE FROM google_calendar_connection
      WHERE user_id = ?
      `,
      [userId]
    );
  }

  private static async getAuthorizedClient(userId: number) {
    const pool = Db.getPool();

    const [rows] = await pool.execute<CalendarConnectionRow[]>(
      `
      SELECT
        user_id,
        access_token,
        refresh_token,
        scope,
        token_type,
        expiry_date,
        updated_at
      FROM google_calendar_connection
      WHERE user_id = ?
      LIMIT 1
      `,
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const connection = rows[0];
    const oauth2Client = CalendarService.createOAuthClient();

    oauth2Client.setCredentials({
      access_token: connection.access_token ?? undefined,
      refresh_token: connection.refresh_token ?? undefined,
      scope: connection.scope ?? undefined,
      token_type: connection.token_type ?? undefined,
      expiry_date: connection.expiry_date ?? undefined,
    });

    oauth2Client.on('tokens', async (tokens) => {
      await pool.execute(
        `
        UPDATE google_calendar_connection
        SET
          access_token = COALESCE(?, access_token),
          refresh_token = COALESCE(?, refresh_token),
          scope = COALESCE(?, scope),
          token_type = COALESCE(?, token_type),
          expiry_date = COALESCE(?, expiry_date)
        WHERE user_id = ?
        `,
        [
          tokens.access_token ?? null,
          tokens.refresh_token ?? null,
          tokens.scope ?? null,
          tokens.token_type ?? null,
          tokens.expiry_date ?? null,
          userId,
        ]
      );
    });

    return oauth2Client;
  }

  private static async getBookingForSync(
    userId: number,
    bookingId: number
  ): Promise<BookingForSyncRow> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<BookingForSyncRow[]>(
      `
      SELECT
        b.id AS booking_id,
        b.user_id,
        e.id AS event_id,
        e.title,
        e.description,
        e.venue,
        e.address,
        e.city,
        e.starts_at,
        e.ends_at
      FROM booking b
      INNER JOIN event e ON e.id = b.event_id
      WHERE b.id = ? AND b.user_id = ?
      LIMIT 1
      `,
      [bookingId, userId]
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.CALENDAR.BOOKING_NOT_FOUND);
    }

    return rows[0];
  }

  private static async getExistingSync(userId: number, bookingId: number) {
    const pool = Db.getPool();

    const [rows] = await pool.execute<BookingSyncRow[]>(
      `
      SELECT
        booking_id,
        event_id,
        google_event_id,
        status,
        last_error,
        synced_at
      FROM booking_calendar_sync
      WHERE booking_id = ? AND user_id = ?
      LIMIT 1
      `,
      [bookingId, userId]
    );

    return rows[0] ?? null;
  }

  private static buildGoogleEventBody(booking: BookingForSyncRow) {
    const location = [booking.venue, booking.address, booking.city]
      .filter(Boolean)
      .join(', ');

    return {
      summary: booking.title,
      description: booking.description,
      location,
      start: {
        dateTime: booking.starts_at.toISOString(),
      },
      end: {
        dateTime: booking.ends_at.toISOString(),
      },
    };
  }

  private static async upsertSyncSuccess(
    userId: number,
    bookingId: number,
    eventId: number,
    googleEventId: string
  ): Promise<BookingCalendarSyncItem> {
    const pool = Db.getPool();

    await pool.execute(
      `
      INSERT INTO booking_calendar_sync (
        booking_id,
        user_id,
        event_id,
        google_event_id,
        status,
        last_error,
        synced_at
      )
      VALUES (?, ?, ?, ?, 'SYNCED', NULL, CURRENT_TIMESTAMP)
      ON DUPLICATE KEY UPDATE
        google_event_id = VALUES(google_event_id),
        status = 'SYNCED',
        last_error = NULL,
        synced_at = CURRENT_TIMESTAMP
      `,
      [bookingId, userId, eventId, googleEventId]
    );

    const saved = await CalendarService.getExistingSync(userId, bookingId);
    return mapSyncRow(saved as BookingSyncRow);
  }

  private static async upsertSyncFailure(
    userId: number,
    bookingId: number,
    eventId: number,
    error: unknown
  ): Promise<BookingCalendarSyncItem> {
    const pool = Db.getPool();
    const message = error instanceof Error ? error.message : 'Sync failed';

    await pool.execute(
      `
      INSERT INTO booking_calendar_sync (
        booking_id,
        user_id,
        event_id,
        google_event_id,
        status,
        last_error,
        synced_at
      )
      VALUES (?, ?, ?, NULL, 'FAILED', ?, NULL)
      ON DUPLICATE KEY UPDATE
        status = 'FAILED',
        last_error = VALUES(last_error)
      `,
      [bookingId, userId, eventId, message]
    );

    const saved = await CalendarService.getExistingSync(userId, bookingId);
    return mapSyncRow(saved as BookingSyncRow);
  }

  static async syncBookingToGoogle(
    userId: number,
    bookingId: number
  ): Promise<BookingCalendarSyncItem | null> {
    const client = await CalendarService.getAuthorizedClient(userId);

    if (!client) {
      return null;
    }

    const booking = await CalendarService.getBookingForSync(userId, bookingId);
    const existingSync = await CalendarService.getExistingSync(userId, bookingId);

    try {
      const calendar = google.calendar({ version: 'v3', auth: client });
      const requestBody = CalendarService.buildGoogleEventBody(booking);

      const result =
        existingSync?.google_event_id && existingSync.status !== 'DELETED'
          ? await calendar.events.update({
              calendarId: 'primary',
              eventId: existingSync.google_event_id,
              requestBody,
            })
          : await calendar.events.insert({
              calendarId: 'primary',
              requestBody,
            });

      if (!result.data.id) {
        throw new Error(ERR_MSGS.CALENDAR.SYNC_FAILED);
      }

      return CalendarService.upsertSyncSuccess(
        userId,
        bookingId,
        booking.event_id,
        result.data.id
      );
    } catch (error) {
      return CalendarService.upsertSyncFailure(
        userId,
        bookingId,
        booking.event_id,
        error
      );
    }
  }

  static async deleteBookingCalendarEvent(
    userId: number,
    bookingId: number
  ): Promise<void> {
    const pool = Db.getPool();
    const existingSync = await CalendarService.getExistingSync(userId, bookingId);

    if (!existingSync?.google_event_id) {
      return;
    }

    const client = await CalendarService.getAuthorizedClient(userId);

    if (!client) {
      return;
    }

    try {
      const calendar = google.calendar({ version: 'v3', auth: client });

      await calendar.events.delete({
        calendarId: 'primary',
        eventId: existingSync.google_event_id,
      });

      await pool.execute(
        `
        UPDATE booking_calendar_sync
        SET status = 'DELETED', last_error = NULL
        WHERE booking_id = ? AND user_id = ?
        `,
        [bookingId, userId]
      );
    } catch (error) {
      const maybeCode = (error as { code?: number }).code;

      if (maybeCode === 404 || maybeCode === 410) {
        await pool.execute(
          `
          UPDATE booking_calendar_sync
          SET status = 'DELETED', last_error = NULL
          WHERE booking_id = ? AND user_id = ?
          `,
          [bookingId, userId]
        );
        return;
      }

      await pool.execute(
        `
        UPDATE booking_calendar_sync
        SET status = 'FAILED', last_error = ?
        WHERE booking_id = ? AND user_id = ?
        `,
        [error instanceof Error ? error.message : 'Delete failed', bookingId, userId]
      );
    }
  }

  static async syncMyBookings(userId: number): Promise<BookingCalendarSyncItem[]> {
    const pool = Db.getPool();
    const client = await CalendarService.getAuthorizedClient(userId);

    if (!client) {
      throw new Error(ERR_MSGS.CALENDAR.CONNECTION_NOT_FOUND);
    }

    const [rows] = await pool.execute<Array<RowDataPacket & { id: number }>>(
      `
      SELECT id
      FROM booking
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [userId]
    );

    const results: BookingCalendarSyncItem[] = [];

    for (const row of rows) {
      const result = await CalendarService.syncBookingToGoogle(userId, row.id);

      if (result) {
        results.push(result);
      }
    }

    return results;
  }
}
