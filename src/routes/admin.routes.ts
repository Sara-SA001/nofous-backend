import { Router } from 'express';
import {
  registerAdmin,
  loginAdmin,
  getCurrentAdmin,
  getRegistrationRequests,
  approveRegistration,
  rejectRegistration,
  getAllLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
  getDeathRequests,
  approveDeathRequest,
  rejectDeathRequest,
  getAllUsers,
  updateUser,
  deleteUser,
  getDashboardStats,
  createSubAdmin,
} from '../controllers/admin.controller';

import { protectAdmin, protect } from '../middleware/auth.middleware';

const router = Router();

// مصادقة
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/me', protect,  getCurrentAdmin);
// طلبات التسجيل
router.get('/registration-requests', protect, protectAdmin('SUB_ADMIN'), getRegistrationRequests);
router.put('/registration-requests/:id/approve', protect, protectAdmin('SUB_ADMIN'), approveRegistration);
router.put('/registration-requests/:id/reject', protect, protectAdmin('SUB_ADMIN'), rejectRegistration);

// طلبات الارتباط
router.get('/link-requests', protect, protectAdmin('SUB_ADMIN'), getAllLinkRequests);
router.put('/link-requests/:id/approve', protect, protectAdmin('SUB_ADMIN'), approveLinkRequest);
router.put('/link-requests/:id/reject', protect, protectAdmin('SUB_ADMIN'), rejectLinkRequest);

// طلبات الوفاة
router.get('/death-requests', protect, protectAdmin('SUB_ADMIN'), getDeathRequests);
router.put('/death-requests/:id/approve', protect, protectAdmin('SUB_ADMIN'), approveDeathRequest);
router.put('/death-requests/:id/reject', protect, protectAdmin('SUB_ADMIN'), rejectDeathRequest);
router.get('/dashboard-stats', protect, protectAdmin('SUB_ADMIN'), getDashboardStats);

// إدارة المستخدمين (للأدمن الرئيسي فقط)
router.get('/users', protect, protectAdmin('SUB_ADMIN'), getAllUsers);
router.put('/users/:id', protect, protectAdmin('SUB_ADMIN'), updateUser);
router.delete('/users/:id', protect, protectAdmin('SUB_ADMIN'), deleteUser);
router.post('/create-subadmin', protect, protectAdmin('ADMIN'), createSubAdmin);

export default router;
