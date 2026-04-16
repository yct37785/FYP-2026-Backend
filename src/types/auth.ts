export type UserRole = 'user' | 'organizer' | 'admin';

export interface JwtPayloadData {
  userId: number;
  email: string;
  role: UserRole;
}