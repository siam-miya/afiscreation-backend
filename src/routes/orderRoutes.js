import express from "express";

import {
  createOrder,
  getOrders,
  updateOrderAddress,
  updateCustomerInfo,
  trackOrder,
  getOrderDetails,
  deleteOrder,
} from "../controllers/orderController.js";

const router =
  express.Router();

// ========================================
// CUSTOMER ORDER CREATE
// ========================================

router.post(
  "/",
  createOrder
);

// ========================================
// ADMIN - GET ALL ORDERS
// ========================================

router.get(
  "/",
  getOrders
);

// ========================================
// ADMIN - DELETE ORDER
// ========================================

router.delete(
  "/:id",
  deleteOrder
);

// ========================================
// ADMIN - UPDATE CUSTOMER PHONE + ADDRESS
// ========================================

router.put(
  "/:id/customer-info",
  updateCustomerInfo
);

// ========================================
// ADMIN - UPDATE CUSTOMER ADDRESS
// ========================================

router.put(
  "/:id/address",
  updateOrderAddress
);

// ========================================
// CUSTOMER - TRACK ORDER
// ========================================

router.get(
  "/track/:orderId",
  trackOrder
);

// ========================================
// CUSTOMER - ORDER DETAILS
// ========================================

router.get(
  "/details/:orderId",
  getOrderDetails
);

export default router;