import { Router } from 'express';
import { 
  getAllLinkRequests,
  approveLinkRequest,
  rejectLinkRequest,
  loginAdmin,
  registerAdmin,
  getAllDeathRequests,
  approveDeathRequest
} from '../controllers/admin.controller';
import { protectAdmin } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerAdmin);
router.post('/login', loginAdmin);
router.get('/link-requests', protectAdmin, getAllLinkRequests);
router.put('/link-requests/:requestId/approve', protectAdmin, approveLinkRequest);
router.put('/link-requests/:requestId/reject', protectAdmin, rejectLinkRequest);
router.get('/death-requests', protectAdmin, getAllDeathRequests);
router.put('/death-requests/:requestId/approve', protectAdmin, approveDeathRequest);

export default router;