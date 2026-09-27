import mongoose from "mongoose";

/* =========================================================
   TRACKING HISTORY SCHEMA
========================================================= */

const trackingHistorySchema =
  new mongoose.Schema(
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

/* =========================================================
   ORDER SCHEMA
========================================================= */

const orderSchema =
  new mongoose.Schema(
    {
      /* =====================================================
         ORDER BASIC INFO
      ===================================================== */

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

      /* =====================================================
         PAYMENT STATUS
      ===================================================== */

      paymentStatus: {
        type: String,

        enum: [
          "Pending",
          "Paid",
          "Failed",
          "Refunded",
        ],

        default: "Pending",

        index: true,
      },

      /* =====================================================
         CART
      ===================================================== */

      cart: [
        {
          productId: {
            type:
              mongoose.Schema.Types.ObjectId,

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

      /* =====================================================
         ORDER STATUS
      ===================================================== */

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

      /* =====================================================
         COURIER
      ===================================================== */

      courier: {
        provider: {
          type: String,

          enum: [
            "Pathao",
            "SteadFast",
            null,
          ],

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

      /* =====================================================
         STEADFAST FRAUD CHECK
      ===================================================== */

      fraudCheck: {
        /* ---------------------------------------------------
           CHECKED
        --------------------------------------------------- */

        checked: {
          type: Boolean,
          default: false,
        },

        /* ---------------------------------------------------
           RISK LEVEL

           IMPORTANT:
           These are the ONLY allowed values.

           Unknown
           Low
           Medium
           High
        --------------------------------------------------- */

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

        /* ---------------------------------------------------
           TOTAL ORDERS / PARCELS
        --------------------------------------------------- */

        totalOrders: {
          type: Number,
          default: 0,
        },

        /* ---------------------------------------------------
           DELIVERED ORDERS
        --------------------------------------------------- */

        deliveredOrders: {
          type: Number,
          default: 0,
        },

        /* ---------------------------------------------------
           CANCELLED ORDERS
        --------------------------------------------------- */

        cancelledOrders: {
          type: Number,
          default: 0,
        },

        /* ---------------------------------------------------
           RETURNED ORDERS
        --------------------------------------------------- */

        returnedOrders: {
          type: Number,
          default: 0,
        },

        /* ---------------------------------------------------
           FRAUD REPORTS

           SteadFast may return:
           - array
           - count

           We normalize it to an array.
        --------------------------------------------------- */

        fraudReports: {
          type: [
            mongoose.Schema.Types.Mixed,
          ],

          default: [],
        },

        /* ---------------------------------------------------
           CANCELLATION RATE
        --------------------------------------------------- */

        cancellationRate: {
          type: Number,
          default: 0,
        },

        /* ---------------------------------------------------
           CHECKED AT
        --------------------------------------------------- */

        checkedAt: {
          type: Date,
          default: null,
        },
      },

      /* =====================================================
         TRACKING HISTORY
      ===================================================== */

      trackingHistory: {
        type: [
          trackingHistorySchema,
        ],

        default: [],
      },

      /* =====================================================
         RECIPIENT LOCATION
      ===================================================== */

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

const Order =
  mongoose.model(
    "Order",
    orderSchema
  );

export default Order;