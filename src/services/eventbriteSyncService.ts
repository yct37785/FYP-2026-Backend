import fs from 'fs/promises';
import path from 'path';
import type {
  EventbriteEventItem,
  EventbriteVenueEventsResponse,
} from '@mytypes/eventbrite';

interface VenueFetchResult {
  venueId: string;
  events: EventbriteEventItem[];
}

export class EventbriteSyncService {
  private static getApiBaseUrl(): string {
    return process.env.EVENTBRITE_API_BASE_URL || 'https://www.eventbriteapi.com/v3';
  }

  private static getApiKey(): string {
    const apiKey = process.env.EVENTBRITE_API_KEY;

    if (!apiKey) {
      throw new Error('EVENTBRITE_API_KEY is not configured');
    }

    return apiKey;
  }

  private static getVenuesFilePath(): string {
    const fileName = process.env.EVENTBRITE_SYNC_VENUES_FILE || 'eventbrite_venues.txt';
    return path.resolve(process.cwd(), fileName);
  }

  private static getDelayMs(): number {
    const value = Number(process.env.EVENTBRITE_SYNC_DELAY_MS || '2000');
    return Number.isNaN(value) || value < 0 ? 2000 : value;
  }

  private static getVenueEventsLimit(): number {
    const value = Number(process.env.EVENTBRITE_VENUE_EVENTS_LIMIT || '10');
    return Number.isNaN(value) || value <= 0 ? 10 : value;
  }

  private static async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  static async readVenueIds(): Promise<string[]> {
    const filePath = EventbriteSyncService.getVenuesFilePath();
    const content = await fs.readFile(filePath, 'utf-8');

    const venueIds = content
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    return Array.from(new Set(venueIds));
  }

  static async fetchVenueEvents(venueId: string): Promise<EventbriteEventItem[]> {
    const apiBaseUrl = EventbriteSyncService.getApiBaseUrl();
    const apiKey = EventbriteSyncService.getApiKey();
    const limit = EventbriteSyncService.getVenueEventsLimit();

    const url = new URL(`${apiBaseUrl}/venues/${venueId}/events/`);
    url.searchParams.set('status', 'live');
    url.searchParams.set('order_by', 'created_desc');
    url.searchParams.set('only_public', 'true');
    url.searchParams.set('page_size', String(limit));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const bodyText = await response.text();
      throw new Error(
        `Eventbrite fetch failed for venue ${venueId}: ${response.status} ${response.statusText} - ${bodyText}`
      );
    }

    const data = (await response.json()) as EventbriteVenueEventsResponse;
    return Array.isArray(data.events) ? data.events : [];
  }

  static async fetchAllVenueEvents(): Promise<VenueFetchResult[]> {
    const venueIds = await EventbriteSyncService.readVenueIds();
    const results: VenueFetchResult[] = [];
    const delayMs = EventbriteSyncService.getDelayMs();

    for (let index = 0; index < venueIds.length; index += 1) {
      const venueId = venueIds[index];
      const events = await EventbriteSyncService.fetchVenueEvents(venueId);

      results.push({
        venueId,
        events,
      });

      const isLast = index === venueIds.length - 1;
      if (!isLast && delayMs > 0) {
        await EventbriteSyncService.sleep(delayMs);
      }
    }

    return results;
  }
}