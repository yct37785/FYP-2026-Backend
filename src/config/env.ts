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
};