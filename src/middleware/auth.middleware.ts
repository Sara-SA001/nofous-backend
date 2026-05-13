import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt.utils';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالدخول - يجب تسجيل الدخول أولاً'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'توكن غير صالح أو منتهي الصلاحية'
    });
  }
};

export const protectAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'غير مصرح لك بالدخول - يجب تسجيل الدخول أولاً'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'يجب أن تكون مسؤولاً للوصول إلى هذه الصفحة'
      });
    }
    if (req.user?.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'غير مصرح لك بهذا الإجراء - يجب أن تكون أدمن' 
    });
  }
  next();

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'توكن غير صالح أو منتهي الصلاحية'
    });
  }
};