import { Db } from '@config/db';
import type { SyncItem } from '@mytypes/sync';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { PoolConnection } from 'mysql2/promise';

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

type DbExecutor = ReturnType<typeof Db.getPool> | PoolConnection;

export class SyncService {
  static async getBySource(source: string): Promise<SyncItem | null> {
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
      [source]
    );

    if (rows.length === 0) {
      return null;
    }

    return mapSyncRow(rows[0]);
  }

  static async create(source: string): Promise<SyncItem> {
    const pool = Db.getPool();

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
      [source]
    );

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
      WHERE id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapSyncRow(rows[0]);
  }

  static async getOrCreateBySource(source: string): Promise<SyncItem> {
    const existing = await SyncService.getBySource(source);

    if (existing) {
      return existing;
    }

    return SyncService.create(source);
  }

  static async markRunStart(
    executor: DbExecutor,
    source: string
  ): Promise<void> {
    await executor.execute(
      `
      UPDATE sync
      SET
        is_running = TRUE,
        last_run_at = NOW(),
        last_error = NULL
      WHERE source = ?
      `,
      [source]
    );
  }

  static async markSuccess(
    executor: DbExecutor,
    source: string,
    params: {
      lastCreatedAt: Date | null;
      totalNewEvents: number;
    }
  ): Promise<void> {
    await executor.execute(
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
      [params.lastCreatedAt, params.totalNewEvents, source]
    );
  }

  static async markFailure(
    executor: DbExecutor,
    source: string,
    errorMessage: string
  ): Promise<void> {
    await executor.execute(
      `
      UPDATE sync
      SET
        last_error = ?,
        is_running = FALSE
      WHERE source = ?
      `,
      [errorMessage, source]
    );
  }

  static async markRunFinished(executor: DbExecutor, source: string): Promise<void> {
    await executor.execute(
      `
      UPDATE sync
      SET is_running = FALSE
      WHERE source = ?
      `,
      [source]
    );
  }
}