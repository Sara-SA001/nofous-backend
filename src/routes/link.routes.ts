import { Router } from 'express';
import { requestFamilyLink, uploadLinkDocuments } from '../controllers/link.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/request', protect, uploadLinkDocuments, requestFamilyLink);

export default router;