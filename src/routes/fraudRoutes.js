import express from "express";
import { checkOrderFraud } from "../controllers/fraudController.js";

const router = express.Router();

router.get(
  "/check/:orderId",
  checkOrderFraud
);

export default router;