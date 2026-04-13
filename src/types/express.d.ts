import { JwtPayloadData } from './auth';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayloadData;
    }
  }
}

export {};