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
  pax: number;
}

interface GetEventsInput {
  ownerId?: number;
  includeSuspended?: boolean;
  categoryId?: number;
  city?: string;
  venue?: string;
  minPrice?: number;
  maxPrice?: number;
  startsFrom?: Date;
  startsTo?: Date;
  keyword?: string;
}

type UpdateEventInput = {
  eventId: number;
  ownerId: number;
} & Partial<Omit<CreateEventInput, 'ownerId'>>;

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

interface EventRow extends RowDataPacket {
  id: number;
  owner_id: number;
  owner_name: string;
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
  pax: number;
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
  ownerName: row.owner_name,
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
  pax: row.pax,
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
        pax,
        source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INTERNAL')
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
        data.pax,
      ]
    );

    const [rows] = await pool.execute<EventRow[]>(
      `
      SELECT
        e.id,
        e.owner_id,
        u.name AS owner_name,
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
        e.pax,
        e.source,
        e.source_name,
        e.external_event_id,
        e.is_suspended,
        e.created_at,
        e.updated_at
      FROM event e
      INNER JOIN category c ON c.id = e.category_id
      INNER JOIN users u ON u.id = e.owner_id
      WHERE e.id = ?
      LIMIT 1
      `,
      [result.insertId]
    );

    return mapEventRow(rows[0]);
  }

  static async getEvents(filters: GetEventsInput): Promise<EventItem[]> {
    const pool = Db.getPool();

    const conditions: string[] = [];
    const values: Array<string | number | Date> = [];

    if (!filters.includeSuspended) {
      conditions.push('e.is_suspended = false');
    }

    if (filters.ownerId !== undefined) {
      conditions.push('e.owner_id = ?');
      values.push(filters.ownerId);
    }

    if (filters.categoryId !== undefined) {
      conditions.push('e.category_id = ?');
      values.push(filters.categoryId);
    }

    if (filters.city) {
      conditions.push('e.city LIKE ?');
      values.push(`%${filters.city}%`);
    }

    if (filters.venue) {
      conditions.push('e.venue LIKE ?');
      values.push(`%${filters.venue}%`);
    }

    if (filters.minPrice !== undefined) {
      conditions.push('e.price >= ?');
      values.push(filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      conditions.push('e.price <= ?');
      values.push(filters.maxPrice);
    }

    if (filters.startsFrom) {
      conditions.push('e.starts_at >= ?');
      values.push(filters.startsFrom);
    }

    if (filters.startsTo) {
      conditions.push('e.starts_at <= ?');
      values.push(filters.startsTo);
    }

    if (filters.keyword) {
      conditions.push(`
        (
          e.title LIKE ?
          OR e.description LIKE ?
          OR e.venue LIKE ?
          OR e.address LIKE ?
          OR e.city LIKE ?
          OR c.name LIKE ?
          OR u.name LIKE ?
        )
      `);

      const keywordValue = `%${filters.keyword}%`;
      values.push(
        keywordValue,
        keywordValue,
        keywordValue,
        keywordValue,
        keywordValue,
        keywordValue,
        keywordValue
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute<EventRow[]>(
      `
      SELECT
        e.id,
        e.owner_id,
        u.name AS owner_name,
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
        e.pax,
        e.source,
        e.source_name,
        e.external_event_id,
        e.is_suspended,
        e.created_at,
        e.updated_at
      FROM event e
      INNER JOIN category c ON c.id = e.category_id
      INNER JOIN users u ON u.id = e.owner_id
      ${whereClause}
      ORDER BY e.starts_at ASC, e.id ASC
      `,
      values
    );

    return rows.map(mapEventRow);
  }

  static async getEventById(
    eventId: number,
    options?: {
      ownerId?: number;
      includeSuspended?: boolean;
    }
  ): Promise<EventItem> {
    const pool = Db.getPool();

    const conditions: string[] = ['e.id = ?'];
    const values: Array<number> = [eventId];

    if (!options?.includeSuspended) {
      conditions.push('e.is_suspended = false');
    }

    if (options?.ownerId !== undefined) {
      conditions.push('e.owner_id = ?');
      values.push(options.ownerId);
    }

    const [rows] = await pool.execute<EventRow[]>(
      `
      SELECT
        e.id,
        e.owner_id,
        u.name AS owner_name,
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
        e.pax,
        e.source,
        e.source_name,
        e.external_event_id,
        e.is_suspended,
        e.created_at,
        e.updated_at
      FROM event e
      INNER JOIN category c ON c.id = e.category_id
      INNER JOIN users u ON u.id = e.owner_id
      WHERE ${conditions.join(' AND ')}
      LIMIT 1
      `,
      values
    );

    if (rows.length === 0) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_FOUND);
    }

    return mapEventRow(rows[0]);
  }

  static async updateMyEvent(data: UpdateEventInput): Promise<EventItem> {
    const pool = Db.getPool();

    const [eventRows] = await pool.execute<EventRow[]>(
      `
      SELECT
        e.id,
        e.owner_id,
        u.name AS owner_name,
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
        e.pax,
        e.source,
        e.source_name,
        e.external_event_id,
        e.is_suspended,
        e.created_at,
        e.updated_at
      FROM event e
      INNER JOIN category c ON c.id = e.category_id
      INNER JOIN users u ON u.id = e.owner_id
      WHERE e.id = ?
      LIMIT 1
      `,
      [data.eventId]
    );

    if (eventRows.length === 0) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_FOUND);
    }

    const event = eventRows[0];

    if (event.owner_id !== data.ownerId) {
      throw new Error(ERR_MSGS.EVENT.EVENT_NOT_OWNER);
    }

    const nextCategoryId = data.categoryId ?? event.category_id;

    const [categoryRows] = await pool.execute<CategoryRow[]>(
      `
      SELECT id, name
      FROM category
      WHERE id = ?
      LIMIT 1
      `,
      [nextCategoryId]
    );

    if (categoryRows.length === 0) {
      throw new Error(ERR_MSGS.EVENT.CATEGORY_NOT_FOUND);
    }

    const nextTitle = data.title ?? event.title;
    const nextDescription = data.description ?? event.description;
    const nextBannerUrl =
      data.bannerUrl !== undefined ? data.bannerUrl : event.banner_url;
    const nextVenue = data.venue ?? event.venue;
    const nextAddress = data.address ?? event.address;
    const nextCity = data.city ?? event.city;
    const nextStartsAt = data.startsAt ?? event.starts_at;
    const nextEndsAt = data.endsAt ?? event.ends_at;
    const nextPrice = data.price ?? Number(event.price);
    const nextPax = data.pax ?? event.pax;

    if (nextEndsAt <= nextStartsAt || nextPax <= 0) {
      throw new Error(ERR_MSGS.EVENT.INVALID_INPUT);
    }

    await pool.execute(
      `
      UPDATE event
      SET
        title = ?,
        description = ?,
        banner_url = ?,
        category_id = ?,
        venue = ?,
        address = ?,
        city = ?,
        starts_at = ?,
        ends_at = ?,
        price = ?,
        pax = ?
      WHERE id = ?
      `,
      [
        nextTitle,
        nextDescription,
        nextBannerUrl,
        nextCategoryId,
        nextVenue,
        nextAddress,
        nextCity,
        nextStartsAt,
        nextEndsAt,
        nextPrice,
        nextPax,
        data.eventId,
      ]
    );

    const [updatedRows] = await pool.execute<EventRow[]>(
      `
      SELECT
        e.id,
        e.owner_id,
        u.name AS owner_name,
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
        e.pax,
        e.source,
        e.source_name,
        e.external_event_id,
        e.is_suspended,
        e.created_at,
        e.updated_at
      FROM event e
      INNER JOIN category c ON c.id = e.category_id
      INNER JOIN users u ON u.id = e.owner_id
      WHERE e.id = ?
      LIMIT 1
      `,
      [data.eventId]
    );

    return mapEventRow(updatedRows[0]);
  }
}