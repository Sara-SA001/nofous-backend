import { Router } from 'express';
import { getCurrentUser } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.get('/me', protect, getCurrentUser);   // محمي بالتوكن

export default router;