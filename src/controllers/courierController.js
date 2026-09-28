import CourierSetting from "../models/courierSettingModel.js";
import Order from "../models/orderModel.js";
import axios from "axios";

import {
  getPathaoAccessToken,
  sendOrderToPathaoAPI,
  getPathaoOrderStatus,
  mapCourierStatus,
} from "../utils/pathaoService.js";

import {
  sendOrderToSteadfastAPI,
  getSteadfastOrderStatus,
  getSteadfastBalance,
  checkSteadfastFraud,
  calculateRiskLevel,
  mapSteadfastStatus,
  normalizeBdPhone,
} from "../utils/steadfastService.js";

/* ======================================================
   COMMON HELPERS
====================================================== */

const validatePathaoBaseUrl = (value) => {
  const baseUrl = String(value ?? "").trim();

  if (!baseUrl) {
    return {
      valid: false,
      message: "Pathao API Base URL is required.",
    };
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    return {
      valid: false,
      message: "Invalid Pathao API Base URL.",
    };
  }

  if (parsedUrl.protocol !== "https:") {
    return {
      valid: false,
      message: "Pathao API Base URL must use HTTPS.",
    };
  }

  return {
    valid: true,
    value: parsedUrl.href.replace(/\/+$/, ""),
  };
};

const validateSteadfastBaseUrl = (value) => {
  const baseUrl = String(value ?? "").trim();

  if (!baseUrl) {
    return {
      valid: false,
      message: "SteadFast API Base URL is required.",
    };
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    return {
      valid: false,
      message: "Invalid SteadFast API Base URL.",
    };
  }

  if (parsedUrl.protocol !== "https:") {
    return {
      valid: false,
      message: "SteadFast API Base URL must use HTTPS.",
    };
  }

  return {
    valid: true,
    value: parsedUrl.href.replace(/\/+$/, ""),
  };
};

/**
 * Returns possible phone formats that may exist
 * in old/new orders.
 *
 * Example:
 * 017xxxxxxxx
 * +88017xxxxxxxx
 * 88017xxxxxxxx
 */
const getPhoneSearchValues = (rawPhone) => {
  const raw = String(rawPhone ?? "").trim();

  let normalized = "";

  try {
    normalized = normalizeBdPhone(raw);
  } catch {
    normalized = "";
  }

  const values = new Set();

  if (raw) {
    values.add(raw);
  }

  if (normalized) {
    values.add(normalized);
    values.add(`+880${normalized.slice(1)}`);
    values.add(`880${normalized.slice(1)}`);
  }

  return [...values];
};

/**
 * Validate fraudCheck before using it.
 */
const isValidFraudCheck = (fraudCheck) => {
  return (
    fraudCheck &&
    typeof fraudCheck === "object" &&
    fraudCheck.checked === true &&
    fraudCheck.checkedAt
  );
};

/**
 * Copy a previously checked fraud result to another order.
 *
 * IMPORTANT:
 * This does NOT call SteadFast.
 * It only reuses the MongoDB result.
 */
const applyFraudCheckToOrder = (
  order,
  fraudCheck,
  phone
) => {
  order.fraudCheck = {
    checked: true,
    riskLevel:
      fraudCheck.riskLevel || "Unknown",

    totalOrders:
      Number(
        fraudCheck.totalOrders ??
          fraudCheck.totalParcels ??
          0
      ),

    totalParcels:
      Number(
        fraudCheck.totalParcels ??
          fraudCheck.totalOrders ??
          0
      ),

    totalDelivered:
      Number(
        fraudCheck.totalDelivered ??
          fraudCheck.deliveredOrders ??
          0
      ),

    totalCancelled:
      Number(
        fraudCheck.totalCancelled ??
          fraudCheck.cancelledOrders ??
          0
      ),

    totalReturned:
      Number(
        fraudCheck.totalReturned ??
          fraudCheck.returnedOrders ??
          0
      ),

    totalFraudReports:
      Number(
        fraudCheck.totalFraudReports ??
          fraudCheck.fraudReports ??
          0
      ),

    fraudReports:
      Number(
        fraudCheck.fraudReports ??
          fraudCheck.totalFraudReports ??
          0
      ),

    cancellationRate:
      Number(
        fraudCheck.cancellationRate ?? 0
      ),

    phone:
      fraudCheck.phone || phone,

    checkedAt:
      fraudCheck.checkedAt,

    courier: "steadfast",

    source:
      fraudCheck.source || "steadfast",
  };
};

/* ======================================================
   PATHAO SETTINGS & CONTROLLERS
====================================================== */

export const savePathaoSettings = async (
  req,
  res
) => {
  try {
    const {
      clientId,
      clientSecret,
      username,
      password,
      storeId,
      baseUrl,
      isActive,
    } = req.body;

    const cleanClientId =
      String(clientId ?? "").trim();

    const cleanUsername =
      String(username ?? "").trim();

    const cleanStoreId =
      String(storeId ?? "").trim();

    if (!cleanClientId) {
      return res.status(400).json({
        success: false,
        message: "Pathao Client ID is required.",
      });
    }

    if (!cleanUsername) {
      return res.status(400).json({
        success: false,
        message: "Pathao Username is required.",
      });
    }

    if (!cleanStoreId) {
      return res.status(400).json({
        success: false,
        message: "Pathao Store ID is required.",
      });
    }

    const numericStoreId =
      Number(cleanStoreId);

    if (
      !Number.isInteger(numericStoreId) ||
      numericStoreId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Pathao Store ID must be a valid number.",
      });
    }

    const existingSetting =
      await CourierSetting.findOne({
        courierName: "pathao",
      });

    const incomingClientSecret =
      String(clientSecret ?? "").trim();

    const incomingPassword =
      String(password ?? "").trim();

    const finalClientSecret =
      incomingClientSecret ||
      existingSetting?.clientSecret ||
      "";

    const finalPassword =
      incomingPassword ||
      existingSetting?.password ||
      "";

    if (!finalClientSecret) {
      return res.status(400).json({
        success: false,
        message:
          "Pathao Client Secret is required.",
      });
    }

    if (!finalPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Pathao Password is required.",
      });
    }

    const submittedBaseUrl =
      String(baseUrl ?? "").trim();

    const finalBaseUrl =
      submittedBaseUrl ||
      existingSetting?.baseUrl ||
      "";

    const baseUrlValidation =
      validatePathaoBaseUrl(
        finalBaseUrl
      );

    if (!baseUrlValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          baseUrlValidation.message,
      });
    }

    const finalIsActive =
      typeof isActive === "boolean"
        ? isActive
        : existingSetting?.isActive ?? true;

    const updatedSetting =
      await CourierSetting.findOneAndUpdate(
        {
          courierName: "pathao",
        },
        {
          courierName: "pathao",
          clientId: cleanClientId,
          clientSecret: finalClientSecret,
          username: cleanUsername,
          password: finalPassword,
          storeId: numericStoreId,
          baseUrl: baseUrlValidation.value,
          isActive: finalIsActive,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Pathao settings saved successfully.",
      settings: {
        courierName:
          updatedSetting.courierName,
        clientId:
          updatedSetting.clientId,
        username:
          updatedSetting.username,
        storeId:
          updatedSetting.storeId,
        baseUrl:
          updatedSetting.baseUrl,
        isActive:
          updatedSetting.isActive,
        hasClientSecret:
          Boolean(
            updatedSetting.clientSecret
          ),
        hasPassword:
          Boolean(
            updatedSetting.password
          ),
        updatedAt:
          updatedSetting.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Save Pathao Settings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to save Pathao settings.",
    });
  }
};

export const getPathaoSettings = async (
  req,
  res
) => {
  try {
    const setting =
      await CourierSetting.findOne({
        courierName: "pathao",
      }).lean();

    if (!setting) {
      return res.status(200).json({
        success: true,
        configured: false,
        settings: {
          clientId: "",
          username: "",
          storeId: "",
          baseUrl: "",
          isActive: false,
          hasClientSecret: false,
          hasPassword: false,
        },
      });
    }

    const configured =
      Boolean(setting.clientId) &&
      Boolean(setting.clientSecret) &&
      Boolean(setting.username) &&
      Boolean(setting.password) &&
      Boolean(setting.storeId) &&
      Boolean(setting.baseUrl);

    return res.status(200).json({
      success: true,
      configured,
      settings: {
        clientId:
          setting.clientId || "",
        username:
          setting.username || "",
        storeId:
          setting.storeId || "",
        baseUrl:
          setting.baseUrl || "",
        isActive:
          Boolean(setting.isActive),
        hasClientSecret:
          Boolean(
            setting.clientSecret
          ),
        hasPassword:
          Boolean(setting.password),
        updatedAt:
          setting.updatedAt || null,
      },
    });
  } catch (error) {
    console.error(
      "Get Pathao Settings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get Pathao settings.",
    });
  }
};

export const testPathaoConnection = async (
  req,
  res
) => {
  try {
    const setting =
      await CourierSetting.findOne({
        courierName: "pathao",
      });

    if (!setting) {
      return res.status(400).json({
        success: false,
        message:
          "Pathao settings not found. Please save settings first.",
      });
    }

    if (
      !setting.clientId ||
      !setting.clientSecret ||
      !setting.username ||
      !setting.password ||
      !setting.baseUrl ||
      !setting.storeId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Pathao credentials are incomplete.",
      });
    }

    await getPathaoAccessToken(setting);

    return res.status(200).json({
      success: true,
      message:
        "Pathao connection successful.",
    });
  } catch (error) {
    console.error(
      "Pathao Test Connection Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Pathao connection failed.",
    });
  }
};

export const pushOrderToPathao = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    const order =
      await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    if (
      order.courier &&
      order.courier.name === "pathao" &&
      order.courier.consignmentId
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This order is already submitted to Pathao.",
        consignmentId:
          order.courier.consignmentId,
      });
    }

    const setting =
      await CourierSetting.findOne({
        courierName: "pathao",
        isActive: true,
      });

    if (!setting) {
      return res.status(400).json({
        success: false,
        message:
          "Active Pathao settings not found.",
      });
    }

    const pathaoResponse =
      await sendOrderToPathaoAPI(
        order,
        setting
      );

    const responseData =
      pathaoResponse?.data?.data ||
      pathaoResponse?.data ||
      pathaoResponse;

    const consignmentId =
      responseData?.consignment_id ||
      responseData?.consignmentId ||
      responseData?.consignment?.id ||
      null;

    const trackingCode =
      responseData?.tracking_code ||
      responseData?.trackingCode ||
      responseData?.consignment
        ?.tracking_code ||
      null;

    if (!consignmentId) {
      return res.status(500).json({
        success: false,
        message:
          "Pathao order created response received, but consignment ID was not found.",
        response: responseData,
      });
    }

    const currentStatus =
      responseData?.order_status ||
      responseData?.status ||
      "Pending";

    const mappedStatus =
      mapCourierStatus(
        currentStatus
      );

    order.courier = {
      name: "pathao",
      consignmentId:
        String(consignmentId),
      trackingCode: trackingCode
        ? String(trackingCode)
        : "",
      status: mappedStatus,
      submittedAt: new Date(),
    };

    order.courierName = "pathao";

    order.consignmentId =
      String(consignmentId);

    if (trackingCode) {
      order.trackingCode =
        String(trackingCode);
    }

    if (
      !Array.isArray(
        order.trackingHistory
      )
    ) {
      order.trackingHistory = [];
    }

    order.trackingHistory.push({
      courier: "pathao",
      status: mappedStatus,
      consignmentId:
        String(consignmentId),
      trackingCode: trackingCode
        ? String(trackingCode)
        : "",
      timestamp: new Date(),
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        "Order successfully submitted to Pathao.",
      data: {
        consignmentId,
        trackingCode,
        status: mappedStatus,
        response: responseData,
      },
    });
  } catch (error) {
    console.error(
      "Pathao Create Order Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to send order to Pathao.",
    });
  }
};

export const trackPathaoOrder = async (
  req,
  res
) => {
  try {
    const { consignmentId } =
      req.params;

    if (!consignmentId) {
      return res.status(400).json({
        success: false,
        message:
          "Consignment ID is required.",
      });
    }

    const setting =
      await CourierSetting.findOne({
        courierName: "pathao",
        isActive: true,
      });

    if (!setting) {
      return res.status(400).json({
        success: false,
        message:
          "Active Pathao settings not found.",
      });
    }

    const response =
      await getPathaoOrderStatus(
        consignmentId,
        setting
      );

    return res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error(
      "Pathao Track Order Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to track Pathao order.",
    });
  }
};

export const syncPathaoOrder = async (
  req,
  res
) => {
  try {
    const { orderId } = req.params;

    const order =
      await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const consignmentId =
      order.courier?.consignmentId ||
      order.consignmentId;

    if (!consignmentId) {
      return res.status(400).json({
        success: false,
        message:
          "This order does not have a Pathao consignment ID.",
      });
    }

    const setting =
      await CourierSetting.findOne({
        courierName: "pathao",
        isActive: true,
      });

    if (!setting) {
      return res.status(400).json({
        success: false,
        message:
          "Active Pathao settings not found.",
      });
    }

    const response =
      await getPathaoOrderStatus(
        consignmentId,
        setting
      );

    const responseData =
      response?.data?.data ||
      response?.data ||
      response;

    const courierStatus =
      responseData?.order_status ||
      responseData?.status ||
      "Unknown";

    const mappedStatus =
      mapCourierStatus(
        courierStatus
      );

    if (order.courier) {
      order.courier.status =
        mappedStatus;

      order.courier.lastSyncedAt =
        new Date();
    }

    if (
      !Array.isArray(
        order.trackingHistory
      )
    ) {
      order.trackingHistory = [];
    }

    order.trackingHistory.push({
      courier: "pathao",
      status: mappedStatus,
      consignmentId:
        String(consignmentId),
      timestamp: new Date(),
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message:
        "Pathao order status synced.",
      data: {
        courierStatus,
        status: mappedStatus,
        consignmentId,
      },
    });
  } catch (error) {
    console.error(
      "Pathao Sync Order Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to sync Pathao order.",
    });
  }
};

/* ======================================================
   STEADFAST SETTINGS
====================================================== */

export const saveSteadfastSettings = async (
  req,
  res
) => {
  try {
    const {
      apiKey,
      secretKey,
      baseUrl,
      isActive,
    } = req.body;

    const cleanApiKey =
      String(apiKey ?? "").trim();

    const existingSetting =
      await CourierSetting.findOne({
        courierName: "steadfast",
      });

    const incomingSecretKey =
      String(secretKey ?? "").trim();

    const finalSecretKey =
      incomingSecretKey ||
      existingSetting?.secretKey ||
      "";

    const finalApiKey =
      cleanApiKey ||
      existingSetting?.apiKey ||
      "";

    if (!finalApiKey) {
      return res.status(400).json({
        success: false,
        message:
          "SteadFast API Key is required.",
      });
    }

    if (!finalSecretKey) {
      return res.status(400).json({
        success: false,
        message:
          "SteadFast Secret Key is required.",
      });
    }

    const submittedBaseUrl =
      String(baseUrl ?? "").trim();

    const finalBaseUrl =
      submittedBaseUrl ||
      existingSetting?.baseUrl ||
      "https://portal.packzy.com/api/v1";

    const baseUrlValidation =
      validateSteadfastBaseUrl(
        finalBaseUrl
      );

    if (!baseUrlValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          baseUrlValidation.message,
      });
    }

    const finalIsActive =
      typeof isActive === "boolean"
        ? isActive
        : existingSetting?.isActive ?? true;

    const updatedSetting =
      await CourierSetting.findOneAndUpdate(
        {
          courierName: "steadfast",
        },
        {
          courierName: "steadfast",
          apiKey: finalApiKey,
          secretKey: finalSecretKey,
          baseUrl:
            baseUrlValidation.value,
          isActive: finalIsActive,
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "SteadFast settings saved successfully.",
      settings: {
        courierName:
          updatedSetting.courierName,
        baseUrl:
          updatedSetting.baseUrl,
        isActive:
          updatedSetting.isActive,
        hasApiKey:
          Boolean(updatedSetting.apiKey),
        hasSecretKey:
          Boolean(
            updatedSetting.secretKey
          ),
        updatedAt:
          updatedSetting.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Save SteadFast Settings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to save SteadFast settings.",
    });
  }
};

export const getSteadfastSettings = async (
  req,
  res
) => {
  try {
    const setting =
      await CourierSetting.findOne({
        courierName: "steadfast",
      }).lean();

    if (!setting) {
      return res.status(200).json({
        success: true,
        configured: false,
        settings: {
          baseUrl: "",
          isActive: false,
          hasApiKey: false,
          hasSecretKey: false,
        },
      });
    }

    const configured =
      Boolean(setting.apiKey) &&
      Boolean(setting.secretKey) &&
      Boolean(setting.baseUrl);

    return res.status(200).json({
      success: true,
      configured,
      settings: {
        baseUrl:
          setting.baseUrl || "",
        isActive:
          Boolean(setting.isActive),
        hasApiKey:
          Boolean(setting.apiKey),
        hasSecretKey:
          Boolean(setting.secretKey),
        updatedAt:
          setting.updatedAt || null,
      },
    });
  } catch (error) {
    console.error(
      "Get SteadFast Settings Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to get SteadFast settings.",
    });
  }
};

export const testSteadfastConnection =
  async (req, res) => {
    try {
      const setting =
        await CourierSetting.findOne({
          courierName: "steadfast",
        });

      if (!setting) {
        return res.status(400).json({
          success: false,
          message:
            "SteadFast settings not found. Please save settings first.",
        });
      }

      if (
        !setting.apiKey ||
        !setting.secretKey ||
        !setting.baseUrl
      ) {
        return res.status(400).json({
          success: false,
          message:
            "SteadFast credentials are incomplete.",
        });
      }

      const balanceResponse =
        await getSteadfastBalance(
          setting
        );

      return res.status(200).json({
        success: true,
        message:
          "SteadFast connection successful.",
        data: balanceResponse,
      });
    } catch (error) {
      console.error(
        "SteadFast Test Connection Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "SteadFast connection failed.",
      });
    }
  };

/* ======================================================
   PUSH ORDER TO STEADFAST
====================================================== */

export const pushOrderToSteadfast =
  async (req, res) => {
    try {
      const { orderId } = req.params;

      const order =
        await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      const existingCourierName =
        String(
          order.courier?.name ||
            order.courier?.provider ||
            order.courierName ||
            ""
        )
          .trim()
          .toLowerCase();

      const existingConsignmentId =
        order.courier?.consignmentId ||
        order.consignmentId ||
        order.consignment_id ||
        "";

      if (
        existingCourierName ||
        existingConsignmentId
      ) {
        if (
          existingCourierName ===
            "steadfast" ||
          existingCourierName ===
            "steadfast courier"
        ) {
          return res.status(400).json({
            success: false,
            message:
              "This order is already submitted to SteadFast.",
            consignmentId:
              existingConsignmentId || null,
          });
        }

        return res.status(400).json({
          success: false,
          message: `This order is already assigned to ${
            existingCourierName ||
            "another courier"
          }.`,
          courier:
            existingCourierName || null,
          consignmentId:
            existingConsignmentId || null,
        });
      }

      const setting =
        await CourierSetting.findOne({
          courierName: "steadfast",
          isActive: true,
        });

      if (!setting) {
        return res.status(400).json({
          success: false,
          message:
            "Active SteadFast settings not found.",
        });
      }

      if (
        !setting.apiKey ||
        !setting.secretKey ||
        !setting.baseUrl
      ) {
        return res.status(400).json({
          success: false,
          message:
            "SteadFast API Key, Secret Key and Base URL are required.",
        });
      }

      const steadfastResponse =
        await sendOrderToSteadfastAPI(
          order,
          setting
        );

      const responseData =
        steadfastResponse?.data ||
        steadfastResponse;

      const consignmentData =
        responseData?.consignment ||
        responseData?.consignment_data ||
        responseData;

      const consignmentId =
        consignmentData?.consignment_id ||
        consignmentData?.consignmentId ||
        consignmentData?.id ||
        responseData?.consignment_id ||
        responseData?.consignmentId ||
        responseData?.id ||
        null;

      const trackingCode =
        consignmentData?.tracking_code ||
        consignmentData?.trackingCode ||
        responseData?.tracking_code ||
        responseData?.trackingCode ||
        null;

      if (!consignmentId) {
        return res.status(500).json({
          success: false,
          message:
            "SteadFast order created response received, but consignment ID was not found.",
          response:
            steadfastResponse,
        });
      }

      const courierStatus =
        consignmentData?.status ||
        responseData?.status ||
        "Pending";

      const mappedStatus =
        mapSteadfastStatus(
          courierStatus
        );

      order.courier = {
        name: "steadfast",
        consignmentId:
          String(consignmentId),
        trackingCode: trackingCode
          ? String(trackingCode)
          : "",
        status: mappedStatus,
        submittedAt: new Date(),
      };

      order.courierName =
        "steadfast";

      order.consignmentId =
        String(consignmentId);

      if (trackingCode) {
        order.trackingCode =
          String(trackingCode);
      }

      if (
        !Array.isArray(
          order.trackingHistory
        )
      ) {
        order.trackingHistory = [];
      }

      order.trackingHistory.push({
        courier: "steadfast",
        status: mappedStatus,
        consignmentId:
          String(consignmentId),
        trackingCode: trackingCode
          ? String(trackingCode)
          : "",
        timestamp: new Date(),
      });

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "Order successfully submitted to SteadFast.",
        data: {
          consignmentId,
          trackingCode,
          status: mappedStatus,
          response:
            steadfastResponse,
        },
      });
    } catch (error) {
      console.error(
        "SteadFast Create Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to send order to SteadFast.",
      });
    }
  };

/* ======================================================
   SYNC STEADFAST ORDER STATUS
====================================================== */

export const syncSteadfastOrder =
  async (req, res) => {
    try {
      const { orderId } = req.params;

      const order =
        await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      const consignmentId =
        order.courier?.consignmentId ||
        order.consignmentId ||
        order.consignment_id;

      if (!consignmentId) {
        return res.status(400).json({
          success: false,
          message:
            "This order does not have a SteadFast consignment ID.",
        });
      }

      const setting =
        await CourierSetting.findOne({
          courierName: "steadfast",
          isActive: true,
        });

      if (!setting) {
        return res.status(400).json({
          success: false,
          message:
            "Active SteadFast settings not found.",
        });
      }

      if (
        !setting.apiKey ||
        !setting.secretKey ||
        !setting.baseUrl
      ) {
        return res.status(400).json({
          success: false,
          message:
            "SteadFast credentials are incomplete.",
        });
      }

      const response =
        await getSteadfastOrderStatus(
          consignmentId,
          setting
        );

      const responseData =
        response?.data ||
        response;

      const courierStatus =
        responseData?.delivery_status ||
        responseData?.deliveryStatus ||
        responseData?.status ||
        "Unknown";

      const mappedStatus =
        mapSteadfastStatus(
          courierStatus
        );

      if (order.courier) {
        order.courier.status =
          mappedStatus;

        order.courier.lastSyncedAt =
          new Date();
      }

      if (
        !Array.isArray(
          order.trackingHistory
        )
      ) {
        order.trackingHistory = [];
      }

      order.trackingHistory.push({
        courier: "steadfast",
        status: mappedStatus,
        consignmentId:
          String(consignmentId),
        timestamp: new Date(),
      });

      await order.save();

      return res.status(200).json({
        success: true,
        message:
          "SteadFast order status synced.",
        data: {
          courierStatus,
          status: mappedStatus,
          consignmentId,
        },
      });
    } catch (error) {
      console.error(
        "SteadFast Sync Order Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to sync SteadFast order.",
      });
    }
  };

/* ======================================================
   CHECK STEADFAST FRAUD
====================================================== */

export const checkSteadfastOrderFraud =
  async (req, res) => {
    try {
      const { orderId } = req.params;

      const order =
        await Order.findById(orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      if (!order.phoneNumber) {
        return res.status(400).json({
          success: false,
          message:
            "Customer phone number is missing.",
        });
      }

      /* -----------------------------------------------
         NORMALIZE PHONE
      ------------------------------------------------ */

      let normalizedPhone;

      try {
        normalizedPhone =
          normalizeBdPhone(
            order.phoneNumber
          );
      } catch (error) {
        return res.status(400).json({
          success: false,
          message:
            error.message ||
            "Invalid Bangladeshi phone number.",
        });
      }

      /* -----------------------------------------------
         ACTIVE SETTINGS
      ------------------------------------------------ */

      const setting =
        await CourierSetting.findOne({
          courierName: "steadfast",
          isActive: true,
        });

      if (!setting) {
        return res.status(400).json({
          success: false,
          message:
            "Active SteadFast settings not found.",
        });
      }

      if (
        !setting.apiKey ||
        !setting.secretKey ||
        !setting.baseUrl
      ) {
        return res.status(400).json({
          success: false,
          message:
            "SteadFast credentials are incomplete.",
        });
      }

      /* -----------------------------------------------
         1. CURRENT ORDER ALREADY CHECKED?
         -----------------------------------------------
         If this exact order already has fraud data,
         don't call SteadFast again.
      ------------------------------------------------ */

      if (
        isValidFraudCheck(
          order.fraudCheck
        )
      ) {
        return res.status(200).json({
          success: true,
          cached: true,
          source: "current-order",
          message:
            "Fraud result already exists for this order.",
          data: {
            phone:
              order.fraudCheck.phone ||
              normalizedPhone,

            totalParcels:
              Number(
                order.fraudCheck.totalParcels ??
                  order.fraudCheck.totalOrders ??
                  0
              ),

            totalDelivered:
              Number(
                order.fraudCheck.totalDelivered ??
                  order.fraudCheck.deliveredOrders ??
                  0
              ),

            totalCancelled:
              Number(
                order.fraudCheck.totalCancelled ??
                  order.fraudCheck.cancelledOrders ??
                  0
              ),

            totalReturned:
              Number(
                order.fraudCheck.totalReturned ??
                  order.fraudCheck.returnedOrders ??
                  0
              ),

            totalFraudReports:
              Number(
                order.fraudCheck.totalFraudReports ??
                  order.fraudCheck.fraudReports ??
                  0
              ),

            cancellationRate:
              Number(
                order.fraudCheck.cancellationRate ??
                  0
              ),

            riskLevel:
              order.fraudCheck.riskLevel ||
              "Unknown",

            checkedAt:
              order.fraudCheck.checkedAt,
          },
        });
      }

      /* -----------------------------------------------
         2. SEARCH DATABASE FOR SAME PHONE
         -----------------------------------------------
         This is the IMPORTANT quota protection.

         If another order with the same phone was already
         checked, reuse its result.

         No SteadFast API request.
      ------------------------------------------------ */

      const phoneSearchValues =
        getPhoneSearchValues(
          order.phoneNumber
        );

      const previousOrder =
        await Order.findOne({
          _id: {
            $ne: order._id,
          },

          phoneNumber: {
            $in: phoneSearchValues,
          },

          "fraudCheck.checked": true,

          "fraudCheck.checkedAt": {
            $exists: true,
          },
        })
          .sort({
            "fraudCheck.checkedAt": -1,
          })
          .lean();

      if (
        previousOrder &&
        isValidFraudCheck(
          previousOrder.fraudCheck
        )
      ) {
        console.log(
          "STEADFAST FRAUD CACHE HIT:",
          {
            currentOrder:
              String(order._id),

            sourceOrder:
              String(previousOrder._id),

            phone:
              normalizedPhone,
          }
        );

        applyFraudCheckToOrder(
          order,
          previousOrder.fraudCheck,
          normalizedPhone
        );

        /*
         * Keep source information so admin/debugging
         * can understand this result was reused.
         */
        order.fraudCheck.source =
          "database-cache";

        await order.save();

        return res.status(200).json({
          success: true,
          cached: true,
          source: "database-cache",

          message:
            "Existing SteadFast fraud result reused for this phone number.",

          data: {
            phone:
              normalizedPhone,

            totalParcels:
              Number(
                previousOrder.fraudCheck
                  .totalParcels ??
                  previousOrder.fraudCheck
                    .totalOrders ??
                  0
              ),

            totalDelivered:
              Number(
                previousOrder.fraudCheck
                  .totalDelivered ??
                  previousOrder.fraudCheck
                    .deliveredOrders ??
                  0
              ),

            totalCancelled:
              Number(
                previousOrder.fraudCheck
                  .totalCancelled ??
                  previousOrder.fraudCheck
                    .cancelledOrders ??
                  0
              ),

            totalReturned:
              Number(
                previousOrder.fraudCheck
                  .totalReturned ??
                  previousOrder.fraudCheck
                    .returnedOrders ??
                  0
              ),

            totalFraudReports:
              Number(
                previousOrder.fraudCheck
                  .totalFraudReports ??
                  previousOrder.fraudCheck
                    .fraudReports ??
                  0
              ),

            cancellationRate:
              Number(
                previousOrder.fraudCheck
                  .cancellationRate ??
                  0
              ),

            riskLevel:
              previousOrder.fraudCheck
                .riskLevel ||
              "Unknown",

            checkedAt:
              previousOrder.fraudCheck
                .checkedAt,
          },
        });
      }

      /* -----------------------------------------------
         3. NO DATABASE CACHE
         -----------------------------------------------
         This is a NEW phone.

         Now and ONLY now call SteadFast.
      ------------------------------------------------ */

      const fraudCredentials = {
        baseUrl: setting.baseUrl,
        apiKey: setting.apiKey,
        secretKey: setting.secretKey,
      };

      console.log(
        "STEADFAST FRAUD API REQUEST:",
        {
          phone: normalizedPhone,
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
        }
      );

      let fraudData;

      try {
        fraudData =
          await checkSteadfastFraud(
            normalizedPhone,
            fraudCredentials
          );
      } catch (error) {
        const message =
          String(
            error?.message || ""
          );

        /* -------------------------------------------
           RATE LIMIT
        -------------------------------------------- */

        if (
          error?.response?.status === 429 ||
          message
            .toLowerCase()
            .includes("rate limit") ||
          message
            .toLowerCase()
            .includes("429")
        ) {
          return res.status(429).json({
            success: false,
            code:
              "STEADFAST_FRAUD_RATE_LIMIT",
            message:
              "SteadFast fraud-check limit reached. Please try again later.",
            retryable: true,
          });
        }

        throw error;
      }

      /* -----------------------------------------------
         4. CALCULATE RISK
      ------------------------------------------------ */

      const riskLevel =
        calculateRiskLevel(
          fraudData
        );

      const totalParcels =
        Number(
          fraudData.totalParcels || 0
        );

      const totalDelivered =
        Number(
          fraudData.totalDelivered || 0
        );

      const totalCancelled =
        Number(
          fraudData.totalCancelled || 0
        );

      const totalReturned =
        Number(
          fraudData.totalReturned || 0
        );

      const totalFraudReports =
        Number(
          fraudData.totalFraudReports ||
            0
        );

      const cancellationRate =
        Number(
          fraudData.cancellationRate || 0
        );

      /* -----------------------------------------------
         5. SAVE NEW FRAUD RESULT
      ------------------------------------------------ */

      order.fraudCheck = {
        checked: true,

        riskLevel,

        phone:
          fraudData.phone ||
          normalizedPhone,

        totalOrders:
          totalParcels,

        totalParcels,

        totalDelivered,

        deliveredOrders:
          totalDelivered,

        totalCancelled,

        cancelledOrders:
          totalCancelled,

        totalReturned,

        returnedOrders:
          totalReturned,

        totalFraudReports,

        fraudReports:
          totalFraudReports,

        cancellationRate,

        checkedAt: new Date(),

        courier: "steadfast",

        source: "steadfast-api",
      };

      await order.save();

      console.log(
        "STEADFAST FRAUD RESULT SAVED:",
        {
          orderId:
            String(order._id),
          phone:
            normalizedPhone,
          totalParcels,
          totalDelivered,
          totalCancelled,
          totalReturned,
          totalFraudReports,
          cancellationRate,
          riskLevel,
        }
      );

      /* -----------------------------------------------
         6. RESPONSE
      ------------------------------------------------ */

      return res.status(200).json({
        success: true,
        cached: false,
        source: "steadfast-api",

        message:
          "SteadFast fraud check completed.",

        data: {
          phone:
            fraudData.phone ||
            normalizedPhone,

          totalParcels,

          totalDelivered,

          totalCancelled,

          totalReturned,

          totalFraudReports,

          cancellationRate,

          riskLevel,

          checkedAt:
            order.fraudCheck.checkedAt,

          raw:
            fraudData.raw,
        },
      });
    } catch (error) {
      console.error(
        "SteadFast Fraud Check Error:",
        error
      );

      const statusCode =
        error?.response?.status;

      if (statusCode === 429) {
        return res.status(429).json({
          success: false,
          code:
            "STEADFAST_FRAUD_RATE_LIMIT",
          message:
            "SteadFast fraud-check limit reached. Please try again later.",
          retryable: true,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to check SteadFast fraud data.",
      });
    }
  };