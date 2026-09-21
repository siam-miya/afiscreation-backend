import mongoose from "mongoose";

const trackingHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
    },

    courierStatus: {
      type: String,
      default: null,
    },

    message: {
      type: String,
      default: "",
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    // ========================================
    // BASIC ORDER INFORMATION
    // ========================================

    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    streetAddress: {
      type: String,
      required: true,
      trim: true,
    },

    phoneNumber: {
      type: String,
      required: true,
      trim: true,
    },

    orderNotes: {
      type: String,
      default: "",
    },

    // ========================================
    // SHIPPING & PAYMENT
    // ========================================

    shippingMethod: {
      type: String,
      required: true,
    },

    shippingCharge: {
      type: Number,
      required: true,
      default: 0,
    },

    totalCost: {
      type: Number,
      required: true,
      default: 0,
    },

    // ========================================
    // ORDER PRODUCTS
    // ========================================

    cart: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },

        cartItemId: {
          type: String,
          required: true,
        },

        title: {
          type: String,
          required: true,
        },

        price: {
          type: Number,
          required: true,
        },

        quantity: {
          type: Number,
          required: true,
          default: 1,
        },

        thumbnail: {
          type: String,
          default: "",
        },

        selectedColor: {
          type: String,
          default: "",
        },

        selectedSize: {
          type: String,
          default: "",
        },

        productNote: {
          type: String,
          default: "",
        },

        // ========================================
        // CUSTOM MEASUREMENT
        // ========================================

        customization: {
          length: {
            type: String,
            default: "",
          },

          height: {
            type: String,
            default: "",
          },

          width: {
            type: String,
            default: "",
          },
        },
      },
    ],

    // ========================================
    // INTERNAL ORDER STATUS
    // ========================================

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Processing",
        "Ready To Ship",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returned",
        "Failed",
      ],
      default: "Pending",
    },

    // ========================================
    // COURIER INFORMATION
    // ========================================

    courier: {
      provider: {
        type: String,
        enum: ["Pathao", "SteadFast", null],
        default: null,
      },

      consignmentId: {
        type: String,
        default: null,
      },

      trackingCode: {
        type: String,
        default: null,
      },

      status: {
        type: String,
        default: null,
      },

      lastSyncedAt: {
        type: Date,
        default: null,
      },
    },

    // ========================================
    // OLD COURIER FIELDS
    // ========================================

    courierName: {
      type: String,
      default: null,
    },

    consignment_id: {
      type: String,
      default: null,
    },

    tracking_code: {
      type: String,
      default: null,
    },

    delivery_status: {
      type: String,
      default: "Pending",
    },

    // ========================================
    // FRAUD CHECK
    // ========================================

    fraudCheck: {
      checked: {
        type: Boolean,
        default: false,
      },

      riskLevel: {
        type: String,
        enum: [
          "Unknown",
          "Low",
          "Medium",
          "High",
        ],
        default: "Unknown",
      },

      totalOrders: {
        type: Number,
        default: 0,
      },

      deliveredOrders: {
        type: Number,
        default: 0,
      },

      cancelledOrders: {
        type: Number,
        default: 0,
      },

      returnedOrders: {
        type: Number,
        default: 0,
      },

      checkedAt: {
        type: Date,
        default: null,
      },
    },

    // ========================================
    // TRACKING HISTORY
    // ========================================

    trackingHistory: {
      type: [trackingHistorySchema],
      default: [],
    },

    // ========================================
    // PATHAO LOCATION
    // ========================================

    recipient_city: {
      type: Number,
      default: null,
    },

    recipient_zone: {
      type: Number,
      default: null,
    },

    recipient_area: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Order = mongoose.model(
  "Order",
  orderSchema
);

export default Order;