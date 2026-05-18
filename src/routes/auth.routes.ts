import { Router } from 'express';
import { registerUser, loginUser, uploadUserPhotos } from '../controllers/auth.controller';
import { getCurrentUser } from '../controllers/user.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', uploadUserPhotos, registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getCurrentUser);

export default router;