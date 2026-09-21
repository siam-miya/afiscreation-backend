import mongoose from "mongoose";

const courierSettingSchema = new mongoose.Schema(
  {
    courierName: {
      type: String,
      enum: ["pathao", "steadfast"],
      required: true,
      unique: true,
      index: true,
    },

    // =========================
    // PATHAO
    // =========================

    clientId: {
      type: String,
      trim: true,
      default: "",
    },

    clientSecret: {
      type: String,
      trim: true,
      default: "",
    },

    username: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      trim: true,
      default: "",
    },

    storeId: {
      type: Number,
      default: null,
    },

    // IMPORTANT:
    // Pathao API URL is dynamic.
    // It will come from Admin Settings.
    baseUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // STEADFAST
    // =========================

    apiKey: {
      type: String,
      trim: true,
      default: "",
    },

    secretKey: {
      type: String,
      trim: true,
      default: "",
    },

    // =========================
    // COMMON
    // =========================

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const CourierSetting =
  mongoose.models.CourierSetting ||
  mongoose.model(
    "CourierSetting",
    courierSettingSchema
  );

export default CourierSetting;