export type UserRole = 'user' | 'organizer' | 'admin';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JwtPayloadData {
  userId: number;
  email: string;
  role: UserRole;
}