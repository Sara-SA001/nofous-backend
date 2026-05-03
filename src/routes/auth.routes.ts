import { Router } from 'express';
import { registerUser, loginUser, uploadUserPhotos } from '../controllers/auth.controller';

const router = Router();

router.post('/register', uploadUserPhotos, registerUser);
router.post('/login', loginUser);

export default router;