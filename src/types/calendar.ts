export type CalendarSyncStatus = 'SYNCED' | 'FAILED' | 'DELETED';

export interface CalendarConnectionStatus {
  connected: boolean;
  updatedAt: Date | null;
}

export interface BookingCalendarSyncItem {
  bookingId: number;
  eventId: number;
  googleEventId: string | null;
  status: CalendarSyncStatus;
  lastError: string | null;
  syncedAt: Date | null;
}
