import fs from 'fs/promises';
import path from 'path';
import { Db } from '@config/db';
import type { SyncItem } from '@mytypes/sync';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface SyncRow extends RowDataPacket {
  id: number;
  source: string;
  last_created_at: Date | null;
  last_run_at: Date | null;
  last_success_at: Date | null;
  last_error: string | null;
  total_new_events: number;
  is_running: number;
  created_at: Date;
  updated_at: Date;
}

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

interface UserRow extends RowDataPacket {
  id: number;
}

interface ExistingEventRow extends RowDataPacket {
  id: number;
  external_event_id: string;
}

const SOURCE = 'eventbrite';
const VENUES_FILE = 'eventbrite_venues.txt';
const FETCH_DELAY_MS = 2000;
const PAGE_SIZE = 10;
const DEFAULT_CITY = 'Singapore';
const DEFAULT_CATEGORY_NAME = 'Other';
const SYNC_OWNER_EMAIL = 'eventbrite-sync@local';
const SYNC_OWNER_NAME = 'Eventbrite Sync';

const EVENTBRITE_CATEGORY_TO_LOCAL_NAME: Record<string, string> = {
  '101': 'Business',
  '102': 'Technology',
  '103': 'Music',
  '104': 'Film & Media',
  '105': 'Arts',
  '106': 'Fashion',
  '107': 'Health',
  '108': 'Sports',
  '109': 'Travel & Outdoor',
  '110': 'Food & Drink',
  '111': 'Charity & Causes',
  '112': 'Government',
  '113': 'Community',
  '114': 'Religion & Spirituality',
  '115': 'Education',
  '116': 'Holiday',
  '117': 'Home & Lifestyle',
  '118': 'Auto, Boat & Air',
  '119': 'Hobbies',
  '120': 'School Activities',
  '199': 'Other',
};

const mapSyncRow = (row: SyncRow): SyncItem => ({
  id: row.id,
  source: row.source,
  lastCreatedAt: row.last_created_at,
  lastRunAt: row.last_run_at,
  lastSuccessAt: row.last_success_at,
  lastError: row.last_error,
  totalNewEvents: row.total_new_events,
  isRunning: Boolean(row.is_running),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class SyncService {
  private static getSyncIntervalMs(): number {
    const value = Number(process.env.EVENTBRITE_SYNC_INTERVAL_MS || 60 * 60 * 1000);

    if (Number.isNaN(value) || value <= 0) {
      return 60 * 60 * 1000;
    }

    return value;
  }

  private static getApiKey(): string {
    const apiKey = process.env.EVENTBRITE_API_KEY;

    if (!apiKey) {
      throw new Error('EVENTBRITE_API_KEY is not configured');
    }

    return apiKey;
  }

  private static async getOrCreateSyncRow(): Promise<SyncItem> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<SyncRow[]>(
      `
      SELECT
        id,
        source,
        last_created_at,
        last_run_at,
        last_success_at,
        last_error,
        total_new_events,
        is_running,
        created_at,
        updated_at
      FROM sync
      WHERE source = ?
      LIMIT 1
      `,
      [SOURCE]
    );

    if (rows.length > 0) {
      return mapSyncRow(rows[0]);
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO sync (
        source,
        last_created_at,
        last_run_at,
        last_success_at,
        last_error,
        total_new_events,
        is_running
      )
      VALUES (?, NULL, NULL, NULL, NULL, 0, FALSE)
      `,
      [SOURCE]
    );

    const [createdRows] = await pool.execute<SyncRow[]>(
      `
      SELECT
        id,
        source,
        last_created_at,
        last_run_at,
        last_success_at,
        last_error,
        total_new_events,
        is_running,
        created_at,
        updated_at
      FROM sync
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapSyncRow(createdRows[0]);
  }

  private static async markRunStart(): Promise<void> {
    const pool = Db.getPool();

    await pool.execute(
      `
      UPDATE sync
      SET
        is_running = TRUE,
        last_run_at = NOW(),
        last_error = NULL
      WHERE source = ?
      `,
      [SOURCE]
    );
  }

  private static async markSuccess(
    lastCreatedAt: Date | null,
    totalNewEvents: number
  ): Promise<void> {
    const pool = Db.getPool();

    await pool.execute(
      `
      UPDATE sync
      SET
        last_created_at = COALESCE(?, last_created_at),
        last_success_at = NOW(),
        last_error = NULL,
        total_new_events = ?,
        is_running = FALSE
      WHERE source = ?
      `,
      [lastCreatedAt, totalNewEvents, SOURCE]
    );
  }

  private static async markFailure(errorMessage: string): Promise<void> {
    const pool = Db.getPool();

    await pool.execute(
      `
      UPDATE sync
      SET
        last_error = ?,
        is_running = FALSE
      WHERE source = ?
      `,
      [errorMessage, SOURCE]
    );
  }

  private static async readVenueRows(): Promise<
    Array<{ venueId: string; venue: string; address: string }>
  > {
    const filePath = path.resolve(process.cwd(), VENUES_FILE);
    const content = await fs.readFile(filePath, 'utf-8');

    return content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [venueIdRaw, venueRaw, addressRaw] = line.split('\\');

        return {
          venueId: String(venueIdRaw ?? '').trim(),
          venue: String(venueRaw ?? '').trim(),
          address: String(addressRaw ?? '').trim(),
        };
      })
      .filter((row) => row.venueId && row.venue && row.address);
  }

  private static async fetchVenueEvents(venueId: string): Promise<any[]> {
    const url = `https://www.eventbriteapi.com/v3/venues/${venueId}/events/?status=live&order_by=created_desc&only_public=true`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SyncService.getApiKey()}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(
        `Eventbrite fetch failed for venue ${venueId}: ${response.status} ${response.statusText} - ${bodyText}`
      );
    }

    const data = await response.json();
    const events = Array.isArray(data?.events) ? data.events : [];

    return events.slice(0, PAGE_SIZE);
  }

  private static async getOrCreateSyncOwnerId(): Promise<number> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<UserRow[]>(
      `
      SELECT id
      FROM users
      WHERE email = ?
      LIMIT 1
      `,
      [SYNC_OWNER_EMAIL]
    );

    if (rows.length > 0) {
      return rows[0].id;
    }

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO users (
        name,
        email,
        password_hash,
        role,
        status,
        credits,
        profile_pic_url,
        description,
        gender,
        age
      )
      VALUES (?, ?, ?, 'organizer', 'active', 0.00, NULL, NULL, NULL, NULL)
      `,
      [SYNC_OWNER_NAME, SYNC_OWNER_EMAIL, 'EXTERNAL_SYNC_ACCOUNT']
    );

    return result.insertId;
  }

  private static async getCategoryNameToIdMap(): Promise<Map<string, number>> {
    const pool = Db.getPool();

    const [rows] = await pool.execute<CategoryRow[]>(
      `
      SELECT id, name
      FROM category
      `
    );

    const map = new Map<string, number>();

    for (const row of rows) {
      map.set(row.name.trim().toLowerCase(), row.id);
    }

    return map;
  }

  private static resolveCategoryId(
    rawEvent: any,
    categoryNameToId: Map<string, number>
  ): number {
    const eventbriteCategoryId =
      rawEvent?.category_id !== undefined && rawEvent?.category_id !== null
        ? String(rawEvent.category_id)
        : null;

    const mappedName =
      (eventbriteCategoryId
        ? EVENTBRITE_CATEGORY_TO_LOCAL_NAME[eventbriteCategoryId]
        : null) || DEFAULT_CATEGORY_NAME;

    const categoryId = categoryNameToId.get(mappedName.trim().toLowerCase());

    if (!categoryId) {
      throw new Error(
        `Local category "${mappedName}" is not seeded in the database`
      );
    }

    return categoryId;
  }

  private static async getExistingExternalEventIds(
    externalEventIds: string[]
  ): Promise<Set<string>> {
    const pool = Db.getPool();

    if (externalEventIds.length === 0) {
      return new Set<string>();
    }

    const placeholders = externalEventIds.map(() => '?').join(',');

    const [rows] = await pool.execute<ExistingEventRow[]>(
      `
      SELECT id, external_event_id
      FROM event
      WHERE source_name = ?
        AND external_event_id IN (${placeholders})
      `,
      [SOURCE, ...externalEventIds]
    );

    return new Set(rows.map((row) => row.external_event_id));
  }

  private static mapRawEventsToInsertValues(params: {
    rawEvents: any[];
    ownerId: number;
    categoryNameToId: Map<string, number>;
    lastCreatedAt: Date | null;
    venueLookup: Map<string, { venue: string; address: string }>;
  }): {
    rows: Array<
      [
        number,
        string,
        string,
        string | null,
        number,
        string,
        string,
        string,
        Date,
        Date,
        number,
        number,
        'EXTERNAL',
        string,
        string,
        string
      ]
    >;
    maxCreatedAtSeen: Date | null;
    skippedOldCount: number;
  } {
    const rows: Array<
      [
        number,
        string,
        string,
        string | null,
        number,
        string,
        string,
        string,
        Date,
        Date,
        number,
        number,
        'EXTERNAL',
        string,
        string,
        string
      ]
    > = [];

    let maxCreatedAtSeen: Date | null = null;
    let skippedOldCount = 0;

    for (const rawEvent of params.rawEvents) {
      const externalEventId = String(rawEvent?.id ?? '').trim();
      const externalUrl = String(rawEvent?.url ?? '').trim();
      const createdAt = new Date(rawEvent?.created);

      if (!externalEventId || !externalUrl || Number.isNaN(createdAt.getTime())) {
        continue;
      }

      if (params.lastCreatedAt && createdAt <= params.lastCreatedAt) {
        skippedOldCount += 1;
        continue;
      }

      if (!maxCreatedAtSeen || createdAt > maxCreatedAtSeen) {
        maxCreatedAtSeen = createdAt;
      }

      const title =
        String(rawEvent?.name?.text ?? '').trim() ||
        String(rawEvent?.summary ?? '').trim() ||
        `Eventbrite Event ${externalEventId}`;

      const description =
        String(rawEvent?.description?.text ?? '').trim() ||
        String(rawEvent?.summary ?? '').trim() ||
        'External event imported from Eventbrite.';

      const bannerUrl =
        rawEvent?.logo?.url || rawEvent?.logo?.original?.url || null;

      const categoryId = SyncService.resolveCategoryId(
        rawEvent,
        params.categoryNameToId
      );

      const venueId = String(rawEvent?.venue_id ?? '').trim();
      const venueInfo = params.venueLookup.get(venueId);

      const venue = venueInfo?.venue || `Eventbrite Venue ${venueId || 'Unknown'}`;
      const address = venueInfo?.address || 'External venue';
      const city = DEFAULT_CITY;

      const startsAt = new Date(rawEvent?.start?.utc);
      const endsAt = new Date(rawEvent?.end?.utc);

      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        continue;
      }

      const price = rawEvent?.is_free ? 1 : 0;

      const capacity =
        typeof rawEvent?.capacity === 'number'
          ? rawEvent.capacity
          : Number(rawEvent?.capacity);

      const pax = !Number.isNaN(capacity) && capacity > 0 ? capacity : 1;

      rows.push([
        params.ownerId,
        title,
        description,
        bannerUrl,
        categoryId,
        venue,
        address,
        city,
        startsAt,
        endsAt,
        price,
        pax,
        'EXTERNAL',
        SOURCE,
        externalEventId,
        externalUrl,
      ]);
    }

    return {
      rows,
      maxCreatedAtSeen,
      skippedOldCount,
    };
  }

  private static async bulkInsertEvents(
    rows: Array<
      [
        number,
        string,
        string,
        string | null,
        number,
        string,
        string,
        string,
        Date,
        Date,
        number,
        number,
        'EXTERNAL',
        string,
        string,
        string
      ]
    >
  ): Promise<number> {
    const pool = Db.getPool();

    if (rows.length === 0) {
      return 0;
    }

    const placeholders = rows
      .map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)')
      .join(', ');

    const flattenedValues = rows.flat();

    const [result] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO event (
        owner_id,
        title,
        description,
        banner_url,
        category_id,
        venue,
        address,
        city,
        starts_at,
        ends_at,
        price,
        pax,
        source,
        source_name,
        external_event_id,
        external_url,
        is_suspended
      )
      VALUES ${placeholders}
      `,
      flattenedValues
    );

    return result.affectedRows;
  }

  static async syncEventbrite(): Promise<void> {
    const syncRow = await SyncService.getOrCreateSyncRow();

    if (syncRow.isRunning) {
      console.log('[sync:eventbrite] skipped because sync is already running');
      return;
    }

    const intervalMs = SyncService.getSyncIntervalMs();
    const now = Date.now();

    if (
      syncRow.lastRunAt &&
      now - intervalMs < new Date(syncRow.lastRunAt).getTime()
    ) {
      console.log(
        `[sync:eventbrite] already synced at ${new Date(syncRow.lastRunAt).toISOString()}`
      );
      return;
    }

    await SyncService.markRunStart();

    try {
      const venueRows = await SyncService.readVenueRows();
      const ownerId = await SyncService.getOrCreateSyncOwnerId();
      const categoryNameToId = await SyncService.getCategoryNameToIdMap();

      const venueLookup = new Map<string, { venue: string; address: string }>();
      for (const row of venueRows) {
        venueLookup.set(row.venueId, {
          venue: row.venue,
          address: row.address,
        });
      }

      const allRawEvents: any[] = [];

      for (let index = 0; index < venueRows.length; index += 1) {
        const row = venueRows[index];
        const venueEvents = await SyncService.fetchVenueEvents(row.venueId);

        allRawEvents.push(...venueEvents);

        const isLast = index === venueRows.length - 1;
        if (!isLast) {
          await sleep(FETCH_DELAY_MS);
        }
      }

      const mapped = SyncService.mapRawEventsToInsertValues({
        rawEvents: allRawEvents,
        ownerId,
        categoryNameToId,
        lastCreatedAt: syncRow.lastCreatedAt,
        venueLookup,
      });

      const candidateExternalIds = mapped.rows.map((row) => row[14]);
      const existingExternalIds =
        await SyncService.getExistingExternalEventIds(candidateExternalIds);

      const finalRows = mapped.rows.filter(
        (row) => !existingExternalIds.has(row[14])
      );

      const insertedCount = await SyncService.bulkInsertEvents(finalRows);

      await SyncService.markSuccess(mapped.maxCreatedAtSeen, insertedCount);

      console.log(
        `[sync:eventbrite] venues=${venueRows.length} fetched=${allRawEvents.length} inserted=${insertedCount} skippedOld=${mapped.skippedOldCount} skippedExisting=${existingExternalIds.size} lastCreatedAt=${mapped.maxCreatedAtSeen?.toISOString() ?? 'null'}`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Eventbrite sync failed';

      await SyncService.markFailure(message);

      console.error(`[sync:eventbrite] failed: ${message}`);
      throw error;
    }
  }
}