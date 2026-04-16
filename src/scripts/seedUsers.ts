import { categoryNames } from '@const/categories';
import type { UserRole } from '@mytypes/user';

export interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  credits: number;
}

export const seedCategories = categoryNames;

export const seedUsers: SeedUser[] = [
  {
    name: 'John Tan',
    email: 'john@example.com',
    password: 'password123',
    role: 'user',
    credits: 100.0,
  },
  {
    name: 'Jane Lim',
    email: 'jane@example.com',
    password: 'password123',
    role: 'user',
    credits: 100.0,
  },
  {
    name: 'Olivia Organizer',
    email: 'organizer@example.com',
    password: 'password123',
    role: 'organizer',
    credits: 100.0,
  },
  {
    name: 'Adam Admin',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    credits: 100.0,
  },
];