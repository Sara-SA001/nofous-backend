import { Router } from 'express';
import { requestFamilyLink, uploadLinkDocuments, getMyLinkRequests } from '../controllers/link.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/request', protect, uploadLinkDocuments, requestFamilyLink);
router.get('/my-requests', protect, getMyLinkRequests);

export default router;