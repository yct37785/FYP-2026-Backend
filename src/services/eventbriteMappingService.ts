import { Db } from '@config/db';
import type { EventbriteEventItem } from '@mytypes/eventbrite';
import { RowDataPacket } from 'mysql2';

interface CategoryRow extends RowDataPacket {
  id: number;
  name: string;
}

export interface MappedExternalEventInput {
  ownerId: number;
  title: string;
  description: string;
  bannerUrl: string | null;
  categoryId: number;
  venue: string;
  address: string;
  city: string;
  startsAt: Date;
  endsAt: Date;
  price: number;
  pax: number;
  source: 'EXTERNAL';
  sourceName: string;
  externalEventId: string;
  externalUrl: string;
}

const EVENTBRITE_CATEGORY_TO_LOCAL_NAME: Record<string, string> = {
  '101': 'Business',
  '102': 'Technology',
  '103': 'Music',
  '104': 'Entertainment',
  '105': 'Arts',
  '106': 'Fashion',
  '107': 'Health',
  '108': 'Sports',
  '109': 'Travel',
  '110': 'Food',
  '111': 'Charity',
  '112': 'Government',
  '113': 'Community',
  '114': 'Religion',
  '115': 'Education',
  '116': 'Holiday',
  '117': 'Lifestyle',
  '118': 'Automotive',
  '119': 'Hobbies',
  '120': 'School Activities',
  '199': 'Other',
};

export class EventbriteMappingService {
  private static categoryNameToIdCache: Map<string, number> | null = null;

  private static getDefaultCity(): string {
    return process.env.EVENTBRITE_DEFAULT_CITY || 'Singapore';
  }

  private static getDefaultCategoryName(): string {
    return process.env.EVENTBRITE_DEFAULT_CATEGORY_NAME || 'Other';
  }

  private static async getCategoryNameToIdMap(): Promise<Map<string, number>> {
    if (EventbriteMappingService.categoryNameToIdCache) {
      return EventbriteMappingService.categoryNameToIdCache;
    }

    const pool = Db.getPool();
    const [rows] = await pool.execute<CategoryRow[]>(
      `
      SELECT
        id,
        name
      FROM category
      `
    );

    const map = new Map<string, number>();

    for (const row of rows) {
      map.set(row.name.trim().toLowerCase(), row.id);
    }

    EventbriteMappingService.categoryNameToIdCache = map;
    return map;
  }

  static async resolveLocalCategoryId(
    eventbriteCategoryId: string | null
  ): Promise<number> {
    const categoryMap = await EventbriteMappingService.getCategoryNameToIdMap();

    const mappedLocalCategoryName =
      (eventbriteCategoryId
        ? EVENTBRITE_CATEGORY_TO_LOCAL_NAME[eventbriteCategoryId]
        : null) || EventbriteMappingService.getDefaultCategoryName();

    const localCategoryId = categoryMap.get(
      mappedLocalCategoryName.trim().toLowerCase()
    );

    if (!localCategoryId) {
      throw new Error(
        `Local category "${mappedLocalCategoryName}" is not seeded in the database`
      );
    }

    return localCategoryId;
  }

  static mapPrice(event: EventbriteEventItem): number {
    return event.is_free ? 0 : 0;
  }

  static mapPax(event: EventbriteEventItem): number {
    const capacity =
      typeof event.capacity === 'number'
        ? event.capacity
        : Number(event.capacity);

    if (!Number.isNaN(capacity) && capacity > 0) {
      return capacity;
    }

    return 1;
  }

  static mapTitle(event: EventbriteEventItem): string {
    return (
      event.name?.text?.trim() ||
      event.summary?.trim() ||
      `Eventbrite Event ${event.id}`
    );
  }

  static mapDescription(event: EventbriteEventItem): string {
    return (
      event.description?.text?.trim() ||
      event.summary?.trim() ||
      'External event imported from Eventbrite.'
    );
  }

  static mapBannerUrl(event: EventbriteEventItem): string | null {
    return event.logo?.url || event.logo?.original?.url || null;
  }

  static mapVenue(event: EventbriteEventItem): string {
    if (event.online_event) {
      return 'Online Event';
    }

    if (event.venue_id) {
      return `Eventbrite Venue ${event.venue_id}`;
    }

    return 'Eventbrite Venue';
  }

  static mapAddress(event: EventbriteEventItem): string {
    if (event.online_event) {
      return 'Online';
    }

    return 'External venue';
  }

  static mapCity(): string {
    return EventbriteMappingService.getDefaultCity();
  }

  static mapStartsAt(event: EventbriteEventItem): Date {
    if (!event.start?.utc) {
      throw new Error(`Eventbrite event ${event.id} is missing start.utc`);
    }

    return new Date(event.start.utc);
  }

  static mapEndsAt(event: EventbriteEventItem): Date {
    if (!event.end?.utc) {
      throw new Error(`Eventbrite event ${event.id} is missing end.utc`);
    }

    return new Date(event.end.utc);
  }

  static async mapToLocalInsertInput(params: {
    event: EventbriteEventItem;
    ownerId: number;
    sourceName: string;
  }): Promise<MappedExternalEventInput> {
    const { event, ownerId, sourceName } = params;

    const categoryId = await EventbriteMappingService.resolveLocalCategoryId(
      event.category_id
    );

    return {
      ownerId,
      title: EventbriteMappingService.mapTitle(event),
      description: EventbriteMappingService.mapDescription(event),
      bannerUrl: EventbriteMappingService.mapBannerUrl(event),
      categoryId,
      venue: EventbriteMappingService.mapVenue(event),
      address: EventbriteMappingService.mapAddress(event),
      city: EventbriteMappingService.mapCity(),
      startsAt: EventbriteMappingService.mapStartsAt(event),
      endsAt: EventbriteMappingService.mapEndsAt(event),
      price: EventbriteMappingService.mapPrice(event),
      pax: EventbriteMappingService.mapPax(event),
      source: 'EXTERNAL',
      sourceName,
      externalEventId: event.id,
      externalUrl: event.url,
    };
  }
}