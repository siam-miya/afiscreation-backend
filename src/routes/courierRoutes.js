import express from "express";

import {
  savePathaoSettings,
  getPathaoSettings,
  testPathaoConnection,
  pushOrderToPathao,
  trackPathaoOrder,
  syncPathaoOrder,
  saveSteadfastSettings,
  getSteadfastSettings,
  testSteadfastConnection,
  pushOrderToSteadfast,
  syncSteadfastOrder,
  checkSteadfastOrderFraud
} from "../controllers/courierController.js";

const router = express.Router();

router.post(
  "/pathao-settings",
  savePathaoSettings
);

router.get(
  "/pathao-settings",
  getPathaoSettings
);

router.post(
  "/pathao-test",
  testPathaoConnection
);

router.post(
  "/push-to-pathao/:orderId",
  pushOrderToPathao
);

router.get(
  "/track-pathao/:orderId",
  trackPathaoOrder
);

router.post(
  "/sync-pathao/:orderId",
  syncPathaoOrder
);

router.post(
  "/steadfast-settings",
  saveSteadfastSettings
);

router.get(
  "/steadfast-settings",
  getSteadfastSettings
);

router.post(
  "/steadfast-test",
  testSteadfastConnection
);

router.post(
  "/push-to-steadfast/:orderId",
  pushOrderToSteadfast
);

router.post(
  "/sync-steadfast/:orderId",
  syncSteadfastOrder
);

router.post(
  "/steadfast-fraud/:orderId",
  checkSteadfastOrderFraud
);

export default router;