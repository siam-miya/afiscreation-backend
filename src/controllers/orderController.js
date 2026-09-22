import Order from "../models/orderModel.js";


// ========================================
// CREATE ORDER
// ========================================

export const createOrder = async (req, res) => {
  try {
    const {
      fullName,
      streetAddress,
      phoneNumber,
      orderNotes,
      cart,
      shippingMethod,
      shippingCharge,
      totalCost,
      recipient_city,
      recipient_zone,
      recipient_area,
    } = req.body;

    // ========================================
    // VALIDATION
    // ========================================

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full name is required!",
      });
    }

    if (
      !streetAddress ||
      !streetAddress.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Address is required!",
      });
    }

    if (
      !phoneNumber ||
      !phoneNumber.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required!",
      });
    }

    if (
      !cart ||
      !Array.isArray(cart) ||
      cart.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty!",
      });
    }

    if (!shippingMethod) {
      return res.status(400).json({
        success: false,
        message:
          "Shipping method is required!",
      });
    }

    // ========================================
    // GENERATE PUBLIC ORDER ID
    // ========================================

    const generatedOrderId =
      `AFIS-${Date.now()}-${Math.floor(
        100 + Math.random() * 900
      )}`;

    // ========================================
    // CREATE ORDER
    // ========================================

    const newOrder = new Order({
      orderId:
        generatedOrderId,

      fullName:
        fullName.trim(),

      streetAddress:
        streetAddress.trim(),

      phoneNumber:
        phoneNumber.trim(),

      orderNotes:
        orderNotes?.trim() || "",

      shippingMethod,

      shippingCharge:
        Number(shippingCharge) || 0,

      totalCost:
        Number(totalCost) || 0,

      cart,

      // ========================================
      // PAYMENT STATUS
      // ========================================

      paymentStatus: "Pending",

      // ========================================
      // PATHAO LOCATION
      // ========================================

      recipient_city:
        recipient_city !==
          undefined &&
        recipient_city !== null &&
        recipient_city !== ""
          ? Number(
              recipient_city
            )
          : null,

      recipient_zone:
        recipient_zone !==
          undefined &&
        recipient_zone !== null &&
        recipient_zone !== ""
          ? Number(
              recipient_zone
            )
          : null,

      recipient_area:
        recipient_area !==
          undefined &&
        recipient_area !== null &&
        recipient_area !== ""
          ? Number(
              recipient_area
            )
          : null,

      // ========================================
      // INITIAL ORDER STATUS
      // ========================================

      status: "Pending",

      // ========================================
      // INITIAL TRACKING HISTORY
      // ========================================

      trackingHistory: [
        {
          status: "Pending",

          message:
            "Your order has been placed successfully.",

          timestamp:
            new Date(),
        },
      ],

      // ========================================
      // INITIAL COURIER INFORMATION
      // ========================================

      courier: {
        provider: null,
        consignmentId: null,
        trackingCode: null,
        status: null,
        lastSyncedAt: null,
      },

      // ========================================
      // INITIAL FRAUD INFORMATION
      // ========================================

      fraudCheck: {
        checked: false,
        riskLevel: "Unknown",
      },
    });

    // ========================================
    // SAVE ORDER
    // ========================================

    const savedOrder =
      await newOrder.save();

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(201).json({
      success: true,

      message:
        "Order placed successfully!",

      orderId:
        generatedOrderId,

      order:
        savedOrder,
    });
  } catch (error) {
    console.error(
      "Order creation error:",
      error
    );

    // ========================================
    // MONGOOSE VALIDATION ERROR
    // ========================================

    if (
      error.name ===
      "ValidationError"
    ) {
      const validationMessages =
        Object.values(
          error.errors
        ).map(
          (err) =>
            err.message
        );

      return res.status(400).json({
        success: false,

        message:
          validationMessages.join(
            ", "
          ),
      });
    }

    return res.status(500).json({
      success: false,

      message:
        "Server error while placing order",
    });
  }
};


// ========================================
// GET ALL ORDERS
// ========================================

export const getOrders = async (
  req,
  res
) => {
  try {
    const orders =
      await Order.find()
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.status(200).json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Fetch orders error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch orders",
    });
  }
};


// ========================================
// ADMIN - UPDATE ORDER STATUS
// ========================================

export const updateOrderStatus =
  async (req, res) => {
    try {
      const { id } = req.params;

      const { status } =
        req.body;

      // ========================================
      // ALLOWED STATUSES
      // ========================================

      const allowedStatuses = [
        "Pending",
        "Confirmed",
        "Processing",
        "Ready To Ship",
        "Shipped",
        "Delivered",
        "Cancelled",
        "Returned",
        "Failed",
      ];

      // ========================================
      // VALIDATION
      // ========================================

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Order ID is required.",
        });
      }

      if (
        !status ||
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order status.",
        });
      }

      // ========================================
      // FIND ORDER
      // ========================================

      const order =
        await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      // ========================================
      // SAME STATUS
      // ========================================

      if (
        order.status === status
      ) {
        return res.status(200).json({
          success: true,

          message:
            "Order status is already " +
            status +
            ".",

          order,
        });
      }

      const previousStatus =
        order.status;

      // ========================================
      // UPDATE STATUS
      // ========================================

      order.status = status;

      // ========================================
      // ADD TRACKING HISTORY
      // ========================================

      order.trackingHistory.push({
        status,

        message:
          `Order status changed from ${previousStatus} to ${status}.`,

        timestamp:
          new Date(),
      });

      // ========================================
      // SAVE
      // ========================================

      const updatedOrder =
        await order.save();

      // ========================================
      // RESPONSE
      // ========================================

      return res.status(200).json({
        success: true,

        message:
          "Order status updated successfully.",

        order:
          updatedOrder,
      });
    } catch (error) {
      console.error(
        "Update order status error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update order status.",
      });
    }
  };


// ========================================
// ADMIN - UPDATE PAYMENT STATUS
// ========================================

export const updatePaymentStatus =
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        paymentStatus,
      } = req.body;

      // ========================================
      // ALLOWED PAYMENT STATUSES
      // ========================================

      const allowedPaymentStatuses = [
        "Pending",
        "Paid",
        "Failed",
        "Refunded",
      ];

      // ========================================
      // VALIDATION
      // ========================================

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Order ID is required.",
        });
      }

      if (
        !paymentStatus ||
        !allowedPaymentStatuses.includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status.",
        });
      }

      // ========================================
      // FIND ORDER
      // ========================================

      const order =
        await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      // ========================================
      // SAME PAYMENT STATUS
      // ========================================

      if (
        order.paymentStatus ===
        paymentStatus
      ) {
        return res.status(200).json({
          success: true,

          message:
            "Payment status is already " +
            paymentStatus +
            ".",

          order,
        });
      }

      // ========================================
      // UPDATE PAYMENT STATUS
      // ========================================

      order.paymentStatus =
        paymentStatus;

      // ========================================
      // SAVE
      // ========================================

      const updatedOrder =
        await order.save();

      // ========================================
      // RESPONSE
      // ========================================

      return res.status(200).json({
        success: true,

        message:
          "Payment status updated successfully.",

        order:
          updatedOrder,
      });
    } catch (error) {
      console.error(
        "Update payment status error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update payment status.",
      });
    }
  };


// ========================================
// ADMIN - UPDATE CUSTOMER ADDRESS
// ========================================

export const updateOrderAddress =
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        streetAddress,
      } = req.body;

      // ========================================
      // BASIC VALIDATION
      // ========================================

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Order ID is required.",
        });
      }

      if (
        typeof streetAddress !==
          "string" ||
        !streetAddress.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Customer address is required.",
        });
      }

      const cleanAddress =
        streetAddress.trim();

      // ========================================
      // FIND ORDER
      // ========================================

      const order =
        await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      // ========================================
      // DO NOT ALLOW ADDRESS CHANGE
      // AFTER COURIER SUBMISSION
      // ========================================

      const courierAlreadySubmitted =
        !!order.courier?.provider ||
        !!order.courier?.consignmentId ||
        !!order.courierName ||
        !!order.consignment_id;

      if (
        courierAlreadySubmitted
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Address cannot be changed after courier submission.",
        });
      }

      // ========================================
      // UPDATE ADDRESS
      // ========================================

      order.streetAddress =
        cleanAddress;

      const updatedOrder =
        await order.save();

      // ========================================
      // RESPONSE
      // ========================================

      return res.status(200).json({
        success: true,

        message:
          "Customer address updated successfully.",

        order:
          updatedOrder,
      });
    } catch (error) {
      console.error(
        "Update order address error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update customer address.",
      });
    }
  };


// ========================================
// ADMIN - UPDATE CUSTOMER PHONE + ADDRESS
// ========================================

export const updateCustomerInfo =
  async (req, res) => {
    try {
      const { id } = req.params;

      const {
        phoneNumber,
        streetAddress,
      } = req.body;

      // ========================================
      // BASIC VALIDATION
      // ========================================

      if (!id) {
        return res.status(400).json({
          success: false,
          message:
            "Order ID is required.",
        });
      }

      if (
        typeof phoneNumber !==
          "string" ||
        !phoneNumber.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number is required.",
        });
      }

      if (
        typeof streetAddress !==
          "string" ||
        !streetAddress.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Customer address is required.",
        });
      }

      const cleanPhone =
        phoneNumber.trim();

      const cleanAddress =
        streetAddress.trim();

      // ========================================
      // FIND ORDER
      // ========================================

      const order =
        await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      // ========================================
      // DO NOT ALLOW CUSTOMER INFO CHANGE
      // AFTER COURIER SUBMISSION
      // ========================================

      const courierAlreadySubmitted =
        !!order.courier?.provider ||
        !!order.courier?.consignmentId ||
        !!order.courierName ||
        !!order.consignment_id;

      if (
        courierAlreadySubmitted
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number and address cannot be changed after courier submission.",
        });
      }

      // ========================================
      // UPDATE CUSTOMER INFO
      // ========================================

      order.phoneNumber =
        cleanPhone;

      order.streetAddress =
        cleanAddress;

      const updatedOrder =
        await order.save();

      // ========================================
      // RESPONSE
      // ========================================

      return res.status(200).json({
        success: true,

        message:
          "Customer information updated successfully.",

        order:
          updatedOrder,
      });
    } catch (error) {
      console.error(
        "Update customer info error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to update customer information.",
      });
    }
  };


// ========================================
// CUSTOMER - TRACK ORDER
// ========================================

export const trackOrder = async (
  req,
  res
) => {
  try {
    const { orderId } =
      req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message:
          "Order ID is required.",
      });
    }

    const cleanOrderId =
      orderId
        .trim()
        .toUpperCase();

    const order =
      await Order.findOne({
        orderId:
          cleanOrderId,
      }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found.",
      });
    }

    // ========================================
    // CUSTOMER-SAFE TRACKING RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,

      order: {
        orderId:
          order.orderId,

        status:
          order.status,

        courier:
          order.courier ||
          null,

        courierName:
          order.courierName ||
          null,

        consignment_id:
          order.consignment_id ||
          null,

        tracking_code:
          order.tracking_code ||
          null,

        delivery_status:
          order.delivery_status ||
          null,

        trackingHistory:
          order.trackingHistory ||
          [],

        createdAt:
          order.createdAt,

        updatedAt:
          order.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Track order error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to track order.",
    });
  }
};


// ========================================
// GET ORDER DETAILS
// ========================================

export const getOrderDetails =
  async (req, res) => {
    try {
      const { orderId } =
        req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message:
            "Order ID is required.",
        });
      }

      const cleanOrderId =
        orderId
          .trim()
          .toUpperCase();

      const order =
        await Order.findOne({
          orderId:
            cleanOrderId,
        }).lean();

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      // ========================================
      // ORDER DETAILS RESPONSE
      // ========================================

      return res.status(200).json({
        success: true,

        order: {
          orderId:
            order.orderId,

          fullName:
            order.fullName,

          phoneNumber:
            order.phoneNumber,

          streetAddress:
            order.streetAddress,

          orderNotes:
            order.orderNotes,

          shippingMethod:
            order.shippingMethod,

          shippingCharge:
            order.shippingCharge,

          totalCost:
            order.totalCost,

          cart:
            order.cart,

          status:
            order.status,

          paymentStatus:
            order.paymentStatus ||
            "Pending",

          createdAt:
            order.createdAt,

          updatedAt:
            order.updatedAt,
        },
      });
    } catch (error) {
      console.error(
        "Get order details error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch order details.",
      });
    }
  };


// ========================================
// ADMIN - DELETE ORDER
// ========================================

export const deleteOrder = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    // ========================================
    // BASIC VALIDATION
    // ========================================

    if (!id) {
      return res.status(400).json({
        success: false,
        message:
          "Order ID is required.",
      });
    }

    // ========================================
    // FIND ORDER
    // ========================================

    const order =
      await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found.",
      });
    }

    // ========================================
    // DELETE ORDER
    // ========================================

    await Order.findByIdAndDelete(id);

    // ========================================
    // RESPONSE
    // ========================================

    return res.status(200).json({
      success: true,

      message:
        "Order deleted successfully.",

      orderId:
        order.orderId,
    });
  } catch (error) {
    console.error(
      "Delete order error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to delete order.",
    });
  }
};