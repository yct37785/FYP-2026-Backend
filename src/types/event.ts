export type EventSource = 'INTERNAL' | 'EXTERNAL';

export interface EventItem {
  id: number;
  ownerId: number;
  title: string;
  description: string;
  bannerUrl: string | null;
  categoryId: number;
  categoryName?: string;
  venue: string;
  address: string;
  city: string;
  startsAt: Date;
  endsAt: Date;
  price: number;
  source: EventSource;
  sourceName: string | null;
  externalEventId: string | null;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}