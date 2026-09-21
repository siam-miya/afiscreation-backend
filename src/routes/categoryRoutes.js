import express from 'express';
import { 
  createCategoryController, 
  getMainCategoriesController, 
  getAllCategoriesController, 
  deleteCategoryController 
} from '../controllers/categoryController.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/create', upload.single('icon'), createCategoryController);
router.get('/main-categories', getMainCategoriesController); // শুধু মেইন ক্যাটাগরি পাওয়ার জন্য
router.get('/all', getAllCategoriesController); // ট্রি স্ট্রাকচারসহ সব পাওয়ার জন্য
router.delete('/delete/:id', deleteCategoryController);

export default router;