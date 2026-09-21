import Order from "../models/orderModel.js";
import CourierSetting from "../models/courierSettingModel.js";

import {
  checkSteadfastFraud,
  calculateRiskLevel,
} from "../utils/steadfastService.js";

export const checkOrderFraud = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (!order.phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "This order has no phone number to check.",
      });
    }

    // ---------------------------------------------------
    // GET ACTIVE STEADFAST SETTINGS
    // ---------------------------------------------------

    const setting = await CourierSetting.findOne({
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

    // ---------------------------------------------------
    // CHECK STEADFAST CREDENTIALS
    // ---------------------------------------------------

    if (!setting.apiKey || !setting.secretKey) {
      return res.status(400).json({
        success: false,
        message:
          "SteadFast API Key or Secret Key is missing. Please save them from Courier Settings.",
      });
    }

    // ---------------------------------------------------
    // STEADFAST CREDENTIALS
    // ---------------------------------------------------

    const fraudCredentials = {
      baseUrl: setting.baseUrl,
      apiKey: setting.apiKey,
      secretKey: setting.secretKey,
    };

    console.log(
      "STEADFAST FRAUD CREDENTIAL CHECK:",
      {
        hasBaseUrl: Boolean(
          fraudCredentials.baseUrl
        ),
        hasApiKey: Boolean(
          fraudCredentials.apiKey
        ),
        hasSecretKey: Boolean(
          fraudCredentials.secretKey
        ),
      }
    );

    // ---------------------------------------------------
    // CALL STEADFAST FRAUD CHECK API
    // ---------------------------------------------------

    let steadfastResult;

    try {
      steadfastResult = await checkSteadfastFraud(
        order.phoneNumber,
        fraudCredentials
      );
    } catch (steadfastError) {
      console.error(
        "SteadFast fraud check failed:",
        steadfastError.message
      );

      return res.status(502).json({
        success: false,
        message:
          steadfastError.message ||
          "SteadFast fraud check failed.",
      });
    }

    const {
      totalParcels,
      totalDelivered,
      totalCancelled,
      totalFraudReports,
    } = steadfastResult;

    // ---------------------------------------------------
    // CALCULATE RISK LEVEL
    // ---------------------------------------------------

    let riskLevel = calculateRiskLevel({
      totalParcels,
      totalCancelled,
      totalFraudReports,
    });

    // ---------------------------------------------------
    // PREVENT MONGOOSE ENUM ERROR
    // ---------------------------------------------------

    const validRiskLevels = [
      "Unknown",
      "Low",
      "Medium",
      "High",
    ];

    if (!validRiskLevels.includes(riskLevel)) {
      riskLevel = "Unknown";
    }

    // ---------------------------------------------------
    // SAVE FRAUD RESULT TO ORDER
    // ---------------------------------------------------

    order.fraudCheck = {
      checked: true,

      riskLevel,

      totalOrders:
        totalParcels,

      deliveredOrders:
        totalDelivered,

      cancelledOrders:
        totalCancelled,

      returnedOrders:
        0,

      fraudReports:
        totalFraudReports,

      checkedAt:
        new Date(),
    };

    await order.save();

    // ---------------------------------------------------
    // RESPONSE
    // ---------------------------------------------------

    return res.status(200).json({
      success: true,
      fraudCheck:
        order.fraudCheck,
    });
  } catch (error) {
    console.error(
      "Fraud check error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Fraud check failed.",
    });
  }
};