import { Router } from 'express';
import { protect } from '../middleware/auth.middleware';
import {
  generateFamilyRecord,
  generateIndividualRecord,
  generateMarriageCertificate,
  generateDeathReport,
} from '../controllers/documents.controller';

const router = Router();

router.get('/family-record', protect, generateFamilyRecord);
router.get('/individual-record', protect, generateIndividualRecord);
router.get('/marriage-certificate', protect, generateMarriageCertificate);
router.get('/death-report', protect, generateDeathReport);

export default router;