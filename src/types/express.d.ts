import { JwtPayload } from '../utils/jwt.utils';   // أو المسار الصحيح

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};