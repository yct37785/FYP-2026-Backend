export interface ReviewItem {
  id: number;
  userId: number;
  userName: string;
  eventId: number;
  eventTitle: string;
  rating: number;
  comment: string;
  isSuspended: boolean;
  createdAt: Date;
  updatedAt: Date;
}