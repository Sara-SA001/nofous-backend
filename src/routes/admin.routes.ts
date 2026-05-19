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

import { protectAdmin, protect, protectAdminPermission } from '../middleware/auth.middleware';

const router = Router();

// مصادقة
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/me', protect,  getCurrentAdmin);
// طلبات التسجيل
router.get('/registration-requests', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_REGISTRATION_REQUESTS'), getRegistrationRequests);
router.put('/registration-requests/:id/approve', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_REGISTRATION_REQUESTS'), approveRegistration);
router.put('/registration-requests/:id/reject', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_REGISTRATION_REQUESTS'), rejectRegistration);

// طلبات الارتباط
router.get('/link-requests', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_LINK_REQUESTS'), getAllLinkRequests);
router.put('/link-requests/:id/approve', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_LINK_REQUESTS'), approveLinkRequest);
router.put('/link-requests/:id/reject', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_LINK_REQUESTS'), rejectLinkRequest);

// طلبات الوفاة
router.get('/death-requests', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_DEATH_REQUESTS'), getDeathRequests);
router.put('/death-requests/:id/approve', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_DEATH_REQUESTS'), approveDeathRequest);
router.put('/death-requests/:id/reject', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_DEATH_REQUESTS'), rejectDeathRequest);
router.get('/dashboard-stats', protect, protectAdmin('SUB_ADMIN'), getDashboardStats);

// إدارة المستخدمين (للأدمن الرئيسي فقط)
router.get('/users', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_USERS'), getAllUsers);
router.put('/users/:id', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_USERS'), updateUser);
router.delete('/users/:id', protect, protectAdmin('SUB_ADMIN'), protectAdminPermission('MANAGE_USERS'), deleteUser);
router.post('/create-subadmin', protect, protectAdmin('ADMIN'), createSubAdmin);

export default router;
