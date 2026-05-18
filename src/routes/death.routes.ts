import { Router } from 'express';
import { requestDeath, uploadDeathDocuments, getMyDeathRequests } from '../controllers/death.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/request', protect, uploadDeathDocuments, requestDeath);
router.get('/my-requests', protect, getMyDeathRequests);

export default router;