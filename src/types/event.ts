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
  source: 'INTERNAL' | 'EXTERNAL';
  sourceName: string | null;
  externalEventId: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED';
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