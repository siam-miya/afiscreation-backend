import express from "express";

import {

  getProducts,

  getUniqueColors,

  getProductById,

  getRelatedProducts,

  createProduct,

  updateProduct,

  deleteProduct

} from "../controllers/productController.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

const uploadProductImages = upload.fields([

  {
    name: "thumbnail",

    maxCount: 1
  },

  {
    name: "sizeChartImage",

    maxCount: 1
  },

  {
    name: "images",

    maxCount: 10
  }

]);

router.get(

  "/",

  getProducts

);

router.get(

  "/colors/all",

  getUniqueColors

);


router.get(

  "/category/:category/:currentId",

  getRelatedProducts

);

router.get(

  "/:id",

  getProductById

);

router.post(

  "/",

  uploadProductImages,

  createProduct

);


// 🟢 UPDATE PRODUCT

router.put(

  "/:id",

  uploadProductImages,

  updateProduct

);


// 🟢 DELETE PRODUCT

router.delete(

  "/:id",

  deleteProduct

);


export default router;