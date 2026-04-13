import jwt from 'jsonwebtoken';
import { env } from '@config/env';
import type { JwtPayloadData } from '@mytypes/auth';

export const signToken = (payload: JwtPayloadData): string => {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
};

export const verifyToken = (token: string): JwtPayloadData => {
  return jwt.verify(token, env.jwtSecret) as JwtPayloadData;
};