import express from "express";

import {
  createShippingZone,
  getShippingZones,
  getShippingZoneById,
  updateShippingZone,
  deleteShippingZone,
  toggleShippingZoneStatus,
  setDefaultShippingZone,
} from "../controllers/shippingZoneController.js";

const router = express.Router();

// Get all shipping zones
router.get("/", getShippingZones);

// Get single shipping zone
router.get("/:id", getShippingZoneById);

// Create shipping zone
router.post("/", createShippingZone);

// Update shipping zone
router.put("/:id", updateShippingZone);

// Delete shipping zone
router.delete("/:id", deleteShippingZone);

// Toggle active/inactive
router.patch("/:id/toggle-status", toggleShippingZoneStatus);

// Set default zone
router.patch("/:id/set-default", setDefaultShippingZone);

export default router;