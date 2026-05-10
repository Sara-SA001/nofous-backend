import { Router } from 'express';
import { 
  getAllLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
  loginAdmin,
  registerAdmin,
  getDeathRequests,
  approveDeathRequest,
  rejectDeathRequest
} from '../controllers/admin.controller';
import { protectAdmin } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/link-requests', protectAdmin, getAllLinkRequests);
router.put('/link-requests/:requestId/approve', protectAdmin, approveLinkRequest);
router.put('/link-requests/:requestId/reject', protectAdmin, rejectLinkRequest);
router.get('/death-requests', protectAdmin, getDeathRequests);
router.put('/death-requests/:requestId/approve', protectAdmin, approveDeathRequest);
router.put('/death-requests/:id/approve', approveDeathRequest);
router.put('/death-requests/:id/reject', rejectDeathRequest);

export default router;