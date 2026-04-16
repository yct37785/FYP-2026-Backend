import { Db } from '@config/db';
import { ERR_MSGS } from '@const/errorMessages';
import type { EventSource, EventItem } from '@mytypes/event';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

interface CreateEventInput {
  ownerId: number;
  title: string;
  description: string;
  bannerUrl?: string | null;
  categoryId: number;
  venue: string;
  address: string;
  city: string;
  startsAt: Date;
  endsAt: Date;
  price: number;
}

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

interface EventRow extends RowDataPacket {
  id: number;
  owner_id: number;
  title: string;
  description: string;
  banner_url: string | null;
  category_id: number;
  category_name?: string;
  venue: string;
  address: string;
  city: string;
  starts_at: Date;
  ends_at: Date;
  price: number;
  source: EventSource;
  source_name: string | null;
  external_event_id: string | null;
  is_suspended: number;
  created_at: Date;
  updated_at: Date;
}

const mapEventRow = (row: EventRow): EventItem => ({
  id: row.id,
  ownerId: row.owner_id,
  title: row.title,
  description: row.description,
  bannerUrl: row.banner_url,
  categoryId: row.category_id,
  categoryName: row.category_name,
  venue: row.venue,
  address: row.address,
  city: row.city,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  price: Number(row.price),
  source: row.source,
  sourceName: row.source_name,
  externalEventId: row.external_event_id,
  isSuspended: Boolean(row.is_suspended),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class EventService {
  static async createEvent(data: CreateEventInput): Promise<EventItem> {
    const pool = Db.getPool();

    const [categoryRows] = await pool.execute<CategoryRow[]>(
      `
      SELECT id, name
      FROM category
      WHERE id = ?
      LIMIT 1
      `,
      [data.categoryId]
    );

    if (categoryRows.length === 0) {
      throw new Error(ERR_MSGS.EVENT.CATEGORY_NOT_FOUND);
    }

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
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INTERNAL')
      `,
      [
        data.ownerId,
        data.title,
        data.description,
        data.bannerUrl ?? null,
        data.categoryId,
        data.venue,
        data.address,
        data.city,
        data.startsAt,
        data.endsAt,
        data.price,
      ]
    );

    const [rows] = await pool.execute<EventRow[]>(
      `
      SELECT
        e.id,
        e.owner_id,
        e.title,
        e.description,
        e.banner_url,
        e.category_id,
        c.name AS category_name,
        e.venue,
        e.address,
        e.city,
        e.starts_at,
        e.ends_at,
        e.price,
        e.source,
        e.source_name,
        e.external_event_id,
        e.is_suspended,
        e.created_at,
        e.updated_at
      FROM event e
      INNER JOIN category c ON c.id = e.category_id
      WHERE e.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapEventRow(rows[0]);
  }
}