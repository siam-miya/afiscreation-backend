import express from "express";

import {
  createOrder,
  getOrders,
  updateOrderStatus,
  updatePaymentStatus,
  updateOrderAddress,
  updateCustomerInfo,
  trackOrder,
  getOrderDetails,
  deleteOrder,
} from "../controllers/orderController.js";

const router =
  express.Router();

router.post(
  "/",
  createOrder
);

router.get(
  "/",
  getOrders
);

router.get(
  "/track/:orderId",
  trackOrder
);

router.get(
  "/details/:orderId",
  getOrderDetails
);

router.put(
  "/:id/status",
  updateOrderStatus
);

router.put(
  "/:id/payment-status",
  updatePaymentStatus
);

router.put(
  "/:id/customer-info",
  updateCustomerInfo
);

router.put(
  "/:id/address",
  updateOrderAddress
);

router.delete(
  "/:id",
  deleteOrder
);


export default router;