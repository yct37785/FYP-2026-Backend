import { UserRole } from '@mytypes/user';

export interface JwtPayloadData {
  userId: number;
  email: string;
  role: UserRole;
}