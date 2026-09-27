import Order from "../models/orderModel.js";
import CourierSetting from "../models/courierSettingModel.js";

import {
  checkSteadfastFraud,
  calculateRiskLevel,
} from "../utils/steadfastService.js";

/* =========================================================
   CHECK ORDER FRAUD
========================================================= */

export const checkOrderFraud = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    /* =====================================================
       FIND ORDER
    ===================================================== */

    const order =
      await Order.findOne({
        _id: orderId,
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found.",
      });
    }

    /* =====================================================
       CHECK PHONE NUMBER
    ===================================================== */

    if (!order.phoneNumber) {
      return res.status(400).json({
        success: false,
        message:
          "This order has no phone number to check.",
      });
    }

    /* =====================================================
       GET ACTIVE STEADFAST SETTINGS
    ===================================================== */

    const setting =
      await CourierSetting.findOne({
        courierName: "steadfast",
        isActive: true,
      });

    if (!setting) {
      return res.status(400).json({
        success: false,
        message:
          "SteadFast settings not found or inactive.",
      });
    }

    /* =====================================================
       CHECK CREDENTIALS
    ===================================================== */

    if (
      !setting.apiKey ||
      !setting.secretKey
    ) {
      return res.status(400).json({
        success: false,
        message:
          "SteadFast API Key or Secret Key is missing. Please save them from Courier Settings.",
      });
    }

    /* =====================================================
       STEADFAST CREDENTIALS
    ===================================================== */

    const fraudCredentials = {
      baseUrl:
        setting.baseUrl,

      apiKey:
        setting.apiKey,

      secretKey:
        setting.secretKey,
    };

    console.log(
      "================================================"
    );

    console.log(
      "STEADFAST FRAUD CREDENTIAL CHECK"
    );

    console.log({
      orderId:
        order._id,

      phoneNumber:
        order.phoneNumber,

      hasBaseUrl:
        Boolean(
          fraudCredentials.baseUrl
        ),

      hasApiKey:
        Boolean(
          fraudCredentials.apiKey
        ),

      hasSecretKey:
        Boolean(
          fraudCredentials.secretKey
        ),
    });

    console.log(
      "================================================"
    );

    /* =====================================================
       CALL STEADFAST FRAUD API
    ===================================================== */

    let steadfastResult;

    try {
      steadfastResult =
        await checkSteadfastFraud(
          order.phoneNumber,
          fraudCredentials
        );
    } catch (
      steadfastError
    ) {
      console.error(
        "================================================"
      );

      console.error(
        "STEADFAST FRAUD CHECK FAILED"
      );

      console.error(
        "Order ID:",
        order._id
      );

      console.error(
        "Phone:",
        order.phoneNumber
      );

      console.error(
        "Error:",
        steadfastError?.message
      );

      console.error(
        "================================================"
      );

      return res.status(502).json({
        success: false,
        message:
          steadfastError?.message ||
          "SteadFast fraud check failed.",
      });
    }

    /* =====================================================
       GET STEADFAST RESULT
    ===================================================== */

    const {
      totalParcels = 0,

      totalDelivered = 0,

      totalCancelled = 0,

      totalReturned = 0,

      totalFraudReports = [],

      cancellationRate = 0,

      hasHistory = false,
    } =
      steadfastResult || {};

    /* =====================================================
       NORMALIZE NUMBERS
    ===================================================== */

    const parcels =
      Number(
        totalParcels || 0
      );

    const delivered =
      Number(
        totalDelivered || 0
      );

    const cancelled =
      Number(
        totalCancelled || 0
      );

    const returned =
      Number(
        totalReturned || 0
      );

    /* =====================================================
       NORMALIZE FRAUD REPORTS
    ===================================================== */

    let fraudReports = [];

    if (
      Array.isArray(
        totalFraudReports
      )
    ) {
      fraudReports =
        totalFraudReports;
    } else if (
      typeof totalFraudReports ===
      "number"
    ) {
      fraudReports =
        Array(
          Math.max(
            0,
            Math.floor(
              totalFraudReports
            )
          )
        ).fill({});
    } else if (
      typeof totalFraudReports ===
        "string" &&
      totalFraudReports.trim() !== ""
    ) {
      const fraudCount =
        Number(
          totalFraudReports
        );

      if (
        Number.isFinite(
          fraudCount
        ) &&
        fraudCount > 0
      ) {
        fraudReports =
          Array(
            Math.floor(
              fraudCount
            )
          ).fill({});
      }
    }

    /* =====================================================
       CALCULATE CANCELLATION RATE
    ===================================================== */

    const calculatedCancellationRate =
      parcels > 0
        ? Number(
            (
              (cancelled /
                parcels) *
              100
            ).toFixed(2)
          )
        : 0;

    const finalCancellationRate =
      parcels > 0
        ? calculatedCancellationRate
        : Number(
            cancellationRate || 0
          );

    /* =====================================================
       CALCULATE RISK LEVEL
    ===================================================== */

    let riskLevel =
      calculateRiskLevel({
        totalParcels:
          parcels,

        totalCancelled:
          cancelled,

        totalFraudReports:
          fraudReports,
      });

    /* =====================================================
       ONLY VALID VALUES FROM ORDER MODEL
    ===================================================== */

    const validRiskLevels = [
      "Unknown",
      "Low",
      "Medium",
      "High",
    ];

    if (
      !validRiskLevels.includes(
        riskLevel
      )
    ) {
      riskLevel =
        "Unknown";
    }

    /* =====================================================
       FINAL HAS HISTORY
    ===================================================== */

    const finalHasHistory =
      Boolean(
        hasHistory ||
          parcels > 0 ||
          delivered > 0 ||
          cancelled > 0 ||
          returned > 0 ||
          fraudReports.length > 0
      );

    /* =====================================================
       LOG FINAL RESULT
    ===================================================== */

    console.log(
      "================================================"
    );

    console.log(
      "STEADFAST FRAUD FINAL RESULT"
    );

    console.log({
      orderId:
        order._id,

      phoneNumber:
        order.phoneNumber,

      totalParcels:
        parcels,

      totalDelivered:
        delivered,

      totalCancelled:
        cancelled,

      totalReturned:
        returned,

      fraudReports:
        fraudReports.length,

      cancellationRate:
        finalCancellationRate,

      riskLevel,

      hasHistory:
        finalHasHistory,
    });

    console.log(
      "================================================"
    );

    /* =====================================================
       SAVE FRAUD RESULT TO ORDER
    ===================================================== */

    order.fraudCheck = {
      checked: true,

      riskLevel,

      totalOrders:
        parcels,

      deliveredOrders:
        delivered,

      cancelledOrders:
        cancelled,

      returnedOrders:
        returned,

      fraudReports:
        fraudReports,

      cancellationRate:
        finalCancellationRate,

      checkedAt:
        new Date(),
    };

    /* =====================================================
       SAVE ORDER
    ===================================================== */

    await order.save();

    /* =====================================================
       RESPONSE
    ===================================================== */

    return res.status(200).json({
      success: true,

      message:
        "SteadFast fraud check completed successfully.",

      fraudCheck:
        order.fraudCheck,
    });
  } catch (error) {
    console.error(
      "================================================"
    );

    console.error(
      "FRAUD CHECK CONTROLLER ERROR"
    );

    console.error(
      error
    );

    console.error(
      "================================================"
    );

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Fraud check failed.",
    });
  }
};