import express from 'express';
import { getAbout, updateAbout } from '../controllers/aboutController.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.get('/', getAbout);
router.post('/', upload.single('aboutImage'), updateAbout);

export default router;