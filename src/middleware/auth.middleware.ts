import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.utils';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// حماية المستخدم العادي
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    req.user = decoded;

    if (req.user.role === 'USER' && req.user.status !== 'APPROVED') {
      if (req.user.status === 'PENDING') {
        return res.status(403).json({ success: false, message: 'حسابك قيد المراجعة' });
      }

      return res.status(403).json({ success: false, message: 'حسابك غير مفعل' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'توكن غير صالح' });
  }
};

// حماية الأدمن (Factory Function)
export const protectAdmin = (minRole: 'ADMIN' | 'SUB_ADMIN' = 'SUB_ADMIN') => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول' });
      }

      if (req.user.role === 'ADMIN') return next();

      if (req.user.role === 'SUB_ADMIN' && minRole === 'SUB_ADMIN') return next();

      return res.status(403).json({ success: false, message: 'صلاحيات غير كافية' });
    } catch (error) {
      return res.status(403).json({ success: false, message: 'خطأ في التحقق من الصلاحيات' });
    }
  };
};
