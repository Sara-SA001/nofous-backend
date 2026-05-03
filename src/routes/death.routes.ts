import { Router } from 'express';
import { requestDeath, uploadDeathDocuments } from '../controllers/death.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/request', protect, uploadDeathDocuments, requestDeath);

export default router;