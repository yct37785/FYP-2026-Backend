export type UserRole = 'user' | 'organizer' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deactivated';
export type UserGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  credits: number;
  profilePicUrl: string | null;
  description: string | null;
  gender: UserGender | null;
  age: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateMyProfileInput {
  name?: string;
  profilePicUrl?: string | null;
  description?: string | null;
  gender?: UserGender | null;
  age?: number | null;
}

export interface MeCategoryItem {
  id: number;
  categoryId: number;
  categoryName: string;
  createdAt: Date;
}