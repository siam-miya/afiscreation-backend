import Order from "../models/orderModel.js";
import CourierSetting from "../models/courierSettingModel.js";

import {
  checkSteadfastFraud,
  calculateRiskLevel,
  normalizeBdPhone,
} from "../utils/steadfastService.js";

/* =========================================================
   CACHE SETTINGS

   Saved fraud result koto ghonta porjonto valid thakbe.
   Ei somoyer moddhe SteadFast API abar call hobe na.
========================================================= */

const FRAUD_CACHE_HOURS = 24;
const FRAUD_CACHE_MS = FRAUD_CACHE_HOURS * 60 * 60 * 1000;

/* =========================================================
   HELPERS
========================================================= */

/**
 * Same phone number er alada alada format khujar jonno:
 * 017xxxxxxxx, +88017xxxxxxxx, 88017xxxxxxxx
 */
const getPhoneSearchValues = (rawPhone) => {
  const raw = String(rawPhone ?? "").trim();
  const values = new Set();

  if (raw) {
    values.add(raw);
  }

  try {
    const normalized = normalizeBdPhone(raw);

    values.add(normalized);
    values.add(`+880${normalized.slice(1)}`);
    values.add(`880${normalized.slice(1)}`);
  } catch {
    // invalid phone hole shudhu raw value diye khujbe
  }

  return [...values];
};

/**
 * Saved fraud result ekhono fresh kina (24 ghontar moddhe kina)
 */
const isFreshFraudCheck = (fraudCheck) => {
  if (!fraudCheck || fraudCheck.checked !== true || !fraudCheck.checkedAt) {
    return false;
  }

  const checkedTime = new Date(fraudCheck.checkedAt).getTime();

  if (Number.isNaN(checkedTime)) {
    return false;
  }

  return Date.now() - checkedTime < FRAUD_CACHE_MS;
};

/* =========================================================
   CHECK ORDER FRAUD
========================================================= */

export const checkOrderFraud = async (req, res) => {
  try {
    const { orderId } = req.params;

    /*
      ?force=true dile cache ignore kore notun kore
      SteadFast API call korbe ("Check Again" button)
    */
    const force = String(req.query?.force || "").toLowerCase() === "true";

    /* =====================================================
       FIND ORDER
    ===================================================== */

    const order = await Order.findOne({
      _id: orderId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    /* =====================================================
       CHECK PHONE NUMBER
    ===================================================== */

    if (!order.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "This order has no phone number to check.",
      });
    }

    /* =====================================================
       CACHE 1: ei order er result already ache?
    ===================================================== */

    if (!force && isFreshFraudCheck(order.fraudCheck)) {
      return res.status(200).json({
        success: true,
        cached: true,
        message: "Saved fraud result loaded.",
        fraudCheck: order.fraudCheck,
      });
    }

    /* =====================================================
       CACHE 2: same phone er onno order check kora ache?

       Thakle SteadFast call na kore oi result reuse korbe.
    ===================================================== */

    if (!force) {
      const previousOrder = await Order.findOne({
        _id: { $ne: order._id },

        phoneNumber: {
          $in: getPhoneSearchValues(order.phoneNumber),
        },

        "fraudCheck.checked": true,

        "fraudCheck.checkedAt": {
          $gte: new Date(Date.now() - FRAUD_CACHE_MS),
        },
      })
        .sort({ "fraudCheck.checkedAt": -1 })
        .lean();

      if (previousOrder?.fraudCheck) {
        console.log("STEADFAST FRAUD DB CACHE HIT:", {
          currentOrder: String(order._id),
          sourceOrder: String(previousOrder._id),
        });

        order.fraudCheck = {
          ...previousOrder.fraudCheck,
        };

        await order.save();

        return res.status(200).json({
          success: true,
          cached: true,
          message: "Existing fraud result reused for this phone number.",
          fraudCheck: order.fraudCheck,
        });
      }
    }

    /* =====================================================
       GET ACTIVE STEADFAST SETTINGS
    ===================================================== */

    const setting = await CourierSetting.findOne({
      courierName: "steadfast",
      isActive: true,
    });

    if (!setting) {
      return res.status(400).json({
        success: false,
        message: "SteadFast settings not found or inactive.",
      });
    }

    /* =====================================================
       CHECK CREDENTIALS
    ===================================================== */

    if (!setting.apiKey || !setting.secretKey) {
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
      baseUrl: setting.baseUrl,
      apiKey: setting.apiKey,
      secretKey: setting.secretKey,
    };

    console.log("================================================");
    console.log("STEADFAST FRAUD CREDENTIAL CHECK");

    console.log({
      orderId: order._id,
      phoneNumber: order.phoneNumber,
      force,
      hasBaseUrl: Boolean(fraudCredentials.baseUrl),
      hasApiKey: Boolean(fraudCredentials.apiKey),
      hasSecretKey: Boolean(fraudCredentials.secretKey),
    });

    console.log("================================================");

    /* =====================================================
       CALL STEADFAST FRAUD API
    ===================================================== */

    let steadfastResult;

    try {
      steadfastResult = await checkSteadfastFraud(
        order.phoneNumber,
        fraudCredentials
      );
    } catch (steadfastError) {
      console.error("================================================");
      console.error("STEADFAST FRAUD CHECK FAILED");
      console.error("Order ID:", order._id);
      console.error("Phone:", order.phoneNumber);
      console.error("Error:", steadfastError?.message);
      console.error("================================================");

      /* ---------------------------------------------------
         RATE LIMIT (429)
      --------------------------------------------------- */

      if (steadfastError?.statusCode === 429) {
        return res.status(429).json({
          success: false,
          code: "STEADFAST_FRAUD_RATE_LIMIT",
          message:
            "SteadFast fraud-check limit reached. Please try again later.",
          retryable: true,
        });
      }

      return res.status(502).json({
        success: false,
        message:
          steadfastError?.message || "SteadFast fraud check failed.",
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
      deliveryRatio = 0,
      returnRatio = 0,
      volumeBand = "",
      doubtfulReports = false,
      hasHistory = false,
    } = steadfastResult || {};

    /* =====================================================
       NORMALIZE NUMBERS
    ===================================================== */

    const parcels = Number(totalParcels || 0);
    const delivered = Number(totalDelivered || 0);
    const cancelled = Number(totalCancelled || 0);
    const returned = Number(totalReturned || 0);

    /* =====================================================
       NORMALIZE FRAUD REPORTS
    ===================================================== */

    let fraudReports = [];

    if (Array.isArray(totalFraudReports)) {
      fraudReports = totalFraudReports;
    } else if (typeof totalFraudReports === "number") {
      fraudReports = Array(
        Math.max(0, Math.floor(totalFraudReports))
      ).fill({});
    } else if (
      typeof totalFraudReports === "string" &&
      totalFraudReports.trim() !== ""
    ) {
      const fraudCount = Number(totalFraudReports);

      if (Number.isFinite(fraudCount) && fraudCount > 0) {
        fraudReports = Array(Math.floor(fraudCount)).fill({});
      }
    }

    /* =====================================================
       CANCELLATION RATE

       SteadFast now returns ratios (not counts), so if we
       have no parcel count we use the ratio from SteadFast.
    ===================================================== */

    const calculatedCancellationRate =
      parcels > 0
        ? Number(((cancelled / parcels) * 100).toFixed(2))
        : 0;

    const finalCancellationRate =
      parcels > 0
        ? calculatedCancellationRate
        : Number(cancellationRate || 0);

    /* =====================================================
       FINAL HAS HISTORY
    ===================================================== */

    const finalHasHistory = Boolean(
      hasHistory ||
        parcels > 0 ||
        delivered > 0 ||
        cancelled > 0 ||
        returned > 0 ||
        fraudReports.length > 0
    );

    /* =====================================================
       CALCULATE RISK LEVEL
    ===================================================== */

    let riskLevel = calculateRiskLevel({
      totalParcels: parcels,
      totalCancelled: cancelled,
      totalFraudReports: fraudReports,
      cancellationRatio: finalCancellationRate,
      hasHistory: finalHasHistory,
      doubtfulReports,
    });

    /* =====================================================
       ONLY VALID VALUES FROM ORDER MODEL
    ===================================================== */

    const validRiskLevels = ["Unknown", "Low", "Medium", "High"];

    if (!validRiskLevels.includes(riskLevel)) {
      riskLevel = "Unknown";
    }

    /* =====================================================
       LOG FINAL RESULT
    ===================================================== */

    console.log("================================================");
    console.log("STEADFAST FRAUD FINAL RESULT");

    console.log({
      orderId: order._id,
      phoneNumber: order.phoneNumber,
      deliveryRatio,
      cancellationRate: finalCancellationRate,
      returnRatio,
      volumeBand,
      fraudReports: fraudReports.length,
      riskLevel,
      hasHistory: finalHasHistory,
    });

    console.log("================================================");

    order.fraudCheck = {
      checked: true,

      riskLevel,

      totalOrders: parcels,
      deliveredOrders: delivered,
      cancelledOrders: cancelled,
      returnedOrders: returned,

      fraudReports: fraudReports,

      cancellationRate: finalCancellationRate,

      deliveryRatio: Number(deliveryRatio || 0),
      returnRatio: Number(returnRatio || 0),
      volumeBand: String(volumeBand || ""),

      checkedAt: new Date(),
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
      cached: false,
      message: "SteadFast fraud check completed successfully.",
      fraudCheck: order.fraudCheck,
    });
  } catch (error) {
    console.error("================================================");
    console.error("FRAUD CHECK CONTROLLER ERROR");
    console.error(error);
    console.error("================================================");

    return res.status(500).json({
      success: false,
      message: error?.message || "Fraud check failed.",
    });
  }
};