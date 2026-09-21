import mongoose from "mongoose";

const shippingZoneSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },

    note: {
      type: String,
      trim: true,
      default: "",
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    freeAbove: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    minDays: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },

    maxDays: {
      type: Number,
      required: true,
      min: 0,
      default: 2,
    },

    position: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const ShippingZone = mongoose.model(
  "ShippingZone",
  shippingZoneSchema
);

export default ShippingZone;