export interface BookingItem {
  id: number;
  userId: number;
  eventId: number;
  eventTitle: string;
  eventPrice: number;
  creditsSpent: number;
  eventStartsAt: Date;
  eventEndsAt: Date;
  eventVenue: string;
  eventCity: string;
  createdAt: Date;
  updatedAt: Date;
}