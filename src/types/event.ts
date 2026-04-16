export type EventSource = 'INTERNAL' | 'EXTERNAL';
export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';

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
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventInput {
  ownerId: number;
  title: string;
  description: string;
  bannerUrl?: string | null;
  categoryId: number;
  venue: string;
  address: string;
  city: string;
  startsAt: string;
  endsAt: string;
  price: number;
}