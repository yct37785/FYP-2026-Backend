export interface FavoriteItem {
  id: number;
  userId: number;
  eventId: number;
  eventTitle: string;
  eventPrice: number;
  eventStartsAt: Date;
  eventEndsAt: Date;
  eventVenue: string;
  eventCity: string;
  createdAt: Date;
  updatedAt: Date;
}