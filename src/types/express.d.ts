import type { JwtPayloadData } from '@mytypes/auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadData;
    }
  }
}

export {};