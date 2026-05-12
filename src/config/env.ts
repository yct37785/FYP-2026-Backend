import dotenv from 'dotenv';
import type { SignOptions, Secret } from 'jsonwebtoken';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3001),
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT || 3306),
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || 'eventsfinder',
  jwtSecret: (process.env.JWT_SECRET || 'supersecretkey123') as Secret,
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  frontendAppUrl: process.env.FRONTEND_APP_URL || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI ||
    `http://localhost:${Number(process.env.PORT || 3001)}/api/calendar/google/callback`,
};