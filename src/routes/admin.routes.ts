import { Router } from 'express';
import { 
  registerAdmin,
  loginAdmin,
  getAllLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
  getDeathRequests,
  approveDeathRequest,
  rejectDeathRequest
} from '../controllers/admin.controller';

import { protectAdmin } from '../middleware/auth.middleware';

const router = Router();

// ====================== مصادقة الأدمن ======================
router.post('/register', registerAdmin);
router.post('/login', loginAdmin);

// ====================== طلبات الارتباط ======================
router.get('/link-requests', protectAdmin, getAllLinkRequests);
router.put('/link-requests/:id/approve', protectAdmin, approveLinkRequest);
router.put('/link-requests/:id/reject', protectAdmin, rejectLinkRequest);

// ====================== طلبات الوفاة ======================
router.get('/death-requests', protectAdmin, getDeathRequests);
router.put('/death-requests/:id/approve', protectAdmin, approveDeathRequest);
router.put('/death-requests/:id/reject', protectAdmin, rejectDeathRequest);

export default router;