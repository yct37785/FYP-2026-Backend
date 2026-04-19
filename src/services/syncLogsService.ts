import { Db } from '@config/db';
import type { SyncItem } from '@mytypes/sync';
import { RowDataPacket } from 'mysql2';

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

export class SyncLogsService {
  static async getSyncLogs(): Promise<SyncItem[]> {
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
      ORDER BY updated_at DESC, id DESC
      `
    );

    return rows.map(mapSyncRow);
  }
}