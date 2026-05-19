import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import type { AdminPermission } from '../constants/adminPermissions';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-2026-change-it';

export interface JwtPayload {
  userId: number;
  nationalId: string;
  role: 'ADMIN' | 'SUB_ADMIN' | 'USER';
  permissions?: AdminPermission[];
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'BANNED';
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};
