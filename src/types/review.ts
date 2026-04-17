export interface ReviewItem {
  id: number;
  userId: number;
  userName: string;
  eventId: number;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}