import express from "express";

import {
  getBanners,
  getAllBannersAdmin,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/bannerController.js";

import upload from "../middleware/uploadMiddleware.js";


const router =
  express.Router();


router.get(
  "/",
  getBanners
);


router.get(
  "/admin",
  getAllBannersAdmin
);


router.post(
  "/",
  upload.single("image"),
  createBanner
);


router.put(
  "/:id",
  upload.single("image"),
  updateBanner
);


router.delete(
  "/:id",
  deleteBanner
);


export default router;