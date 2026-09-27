import axios from "axios";

const DEFAULT_STEADFAST_BASE_URL =
  "https://portal.packzy.com/api/v1";

const getSteadfastConfig = (credentials = {}) => {
  const baseUrl = String(
    credentials?.baseUrl ||
      DEFAULT_STEADFAST_BASE_URL
  )
    .trim()
    .replace(/\/+$/, "");

  const apiKey = String(
    credentials?.apiKey || ""
  ).trim();

  const secretKey = String(
    credentials?.secretKey || ""
  ).trim();

  console.log(
    "STEADFAST CONFIG CHECK:",
    {
      baseUrl,
      hasApiKey: Boolean(apiKey),
      hasSecretKey: Boolean(secretKey),
    }
  );

  if (!baseUrl) {
    throw new Error(
      "SteadFast Base URL is missing."
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(baseUrl);
  } catch (error) {
    throw new Error(
      "Invalid SteadFast Base URL."
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      "SteadFast Base URL must use HTTPS."
    );
  }

  if (!apiKey) {
    throw new Error(
      "SteadFast API Key is missing."
    );
  }

  if (!secretKey) {
    throw new Error(
      "SteadFast Secret Key is missing."
    );
  }

  return {
    baseUrl,
    apiKey,
    secretKey,
  };
};

/* =========================================================
   NORMALIZE BANGLADESHI PHONE
========================================================= */

export const normalizeBdPhone = (rawPhone) => {
  let phone = String(rawPhone || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  // +8801712345678
  // -> 01712345678
  if (phone.startsWith("+880")) {
    phone = `0${phone.slice(4)}`;
  }

  // 8801712345678
  // -> 01712345678
  else if (phone.startsWith("880")) {
    phone = `0${phone.slice(3)}`;
  }

  // Must be:
  // 013XXXXXXXX
  // 014XXXXXXXX
  // 015XXXXXXXX
  // 016XXXXXXXX
  // 017XXXXXXXX
  // 018XXXXXXXX
  // 019XXXXXXXX

  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw new Error(
      "Invalid Bangladeshi phone number."
    );
  }

  return phone;
};

/* =========================================================
   CREATE ORDER IN STEADFAST
========================================================= */

export const sendOrderToSteadfastAPI = async (
  order,
  credentials = {}
) => {
  const config =
    getSteadfastConfig(credentials);

  const invoice =
    order?.orderId ||
    String(order?._id || "");

  const recipientName =
    order?.fullName ||
    order?.customerName ||
    "";

  const recipientPhone =
    normalizeBdPhone(
      order?.phoneNumber ||
        order?.phone ||
        ""
    );

  const recipientAddress =
    order?.streetAddress ||
    order?.address ||
    "";

  const codAmount = Number(
    order?.totalCost || 0
  );

  const cartItems =
    Array.isArray(order?.cart)
      ? order.cart
      : Array.isArray(order?.items)
      ? order.items
      : [];

  const totalLot =
    cartItems.reduce(
      (total, item) =>
        total +
        Number(
          item?.quantity ||
            item?.qty ||
            1
        ),
      0
    );

  const itemDescription =
    cartItems
      .map((item) => {
        const title =
          item?.title ||
          item?.name ||
          item?.productName ||
          "Product";

        const quantity = Number(
          item?.quantity ||
            item?.qty ||
            1
        );

        return `${title} x ${quantity}`;
      })
      .join(", ");

  if (!invoice) {
    throw new Error(
      "Order invoice/orderId is missing."
    );
  }

  if (!recipientName) {
    throw new Error(
      "Recipient name is missing."
    );
  }

  if (!recipientAddress) {
    throw new Error(
      "Recipient address is missing."
    );
  }

  if (!codAmount || codAmount < 0) {
    throw new Error(
      "Invalid COD amount."
    );
  }

  const payload = {
    invoice,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    recipient_address: recipientAddress,
    cod_amount: codAmount,
    item_description:
      itemDescription ||
      "E-commerce Order",
    total_lot: totalLot || 1,
  };

  if (order?.orderNotes) {
    payload.note = String(
      order.orderNotes
    ).trim();
  }

  console.log(
    "================================================"
  );

  console.log(
    "STEADFAST CREATE ORDER REQUEST"
  );

  console.log({
    baseUrl: config.baseUrl,
    invoice: payload.invoice,
    recipientName:
      payload.recipient_name,
    recipientPhone:
      payload.recipient_phone,
    recipientAddress:
      payload.recipient_address,
    codAmount:
      payload.cod_amount,
    totalLot:
      payload.total_lot,
  });

  console.log(
    "================================================"
  );

  try {
    const response =
      await axios.post(
        `${config.baseUrl}/create_order`,
        payload,
        {
          headers: {
            "Api-Key":
              config.apiKey,
            "Secret-Key":
              config.secretKey,
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          timeout: 30000,
        }
      );

    console.log(
      "STEADFAST CREATE ORDER RESPONSE"
    );

    console.log(
      response.data
    );

    return response.data;
  } catch (error) {
    console.error(
      "STEADFAST CREATE ORDER ERROR"
    );

    console.error(
      "HTTP Status:",
      error?.response?.status
    );

    console.error(
      "SteadFast Response:",
      error?.response?.data ||
        error?.message
    );

    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to create SteadFast order."
    );
  }
};

/* =========================================================
   GET STEADFAST ORDER STATUS
========================================================= */

export const getSteadfastOrderStatus = async (
  consignmentId,
  credentials = {}
) => {
  const config =
    getSteadfastConfig(credentials);

  if (!consignmentId) {
    throw new Error(
      "SteadFast consignment ID is missing."
    );
  }

  try {
    const response =
      await axios.get(
        `${config.baseUrl}/status_by_cid/${encodeURIComponent(
          consignmentId
        )}`,
        {
          headers: {
            "Api-Key":
              config.apiKey,
            "Secret-Key":
              config.secretKey,
            Accept:
              "application/json",
          },
          timeout: 30000,
        }
      );

    return response.data;
  } catch (error) {
    console.error(
      "STEADFAST STATUS ERROR:",
      error?.response?.data ||
        error?.message
    );

    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to get SteadFast order status."
    );
  }
};

/* =========================================================
   GET STEADFAST BALANCE
========================================================= */

export const getSteadfastBalance = async (
  credentials = {}
) => {
  const config =
    getSteadfastConfig(credentials);

  try {
    const response =
      await axios.get(
        `${config.baseUrl}/get_balance`,
        {
          headers: {
            "Api-Key":
              config.apiKey,
            "Secret-Key":
              config.secretKey,
            Accept:
              "application/json",
          },
          timeout: 30000,
        }
      );

    return response.data;
  } catch (error) {
    console.error(
      "STEADFAST BALANCE ERROR:",
      error?.response?.data ||
        error?.message
    );

    throw new Error(
      error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to connect to SteadFast."
    );
  }
};

/* =========================================================
   HELPER
   CONVERT VALUE TO NUMBER SAFELY
========================================================= */

const toSafeNumber = (
  value,
  fallback = 0
) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

/* =========================================================
   FRAUD CACHE
   5 MINUTES PER PHONE
========================================================= */

const FRAUD_CACHE_TTL =
  5 * 60 * 1000;

// phone -> { data, expiresAt }
const fraudCache = new Map();

// phone -> Promise
// Prevents multiple simultaneous requests
// for the same phone number.
const fraudRequests = new Map();

/* =========================================================
   STEADFAST FRAUD CHECK
   Production-safe version
========================================================= */

export const checkSteadfastFraud = async (
  rawPhone,
  credentials = {}
) => {
  const config =
    getSteadfastConfig(credentials);

  const phone =
    normalizeBdPhone(rawPhone);

  /* =====================================================
     CHECK CACHE
  ===================================================== */

  const cached =
    fraudCache.get(phone);

  if (
    cached &&
    cached.expiresAt > Date.now()
  ) {
    console.log(
      `STEADFAST FRAUD CACHE HIT: ${phone}`
    );

    return cached.data;
  }

  // Remove expired cache
  if (cached) {
    fraudCache.delete(phone);
  }

  /* =====================================================
     PREVENT DUPLICATE SIMULTANEOUS REQUESTS
  ===================================================== */

  const existingRequest =
    fraudRequests.get(phone);

  if (existingRequest) {
    console.log(
      `STEADFAST FRAUD REQUEST ALREADY RUNNING: ${phone}`
    );

    return existingRequest;
  }

  /* =====================================================
     CREATE API REQUEST
  ===================================================== */

  const requestPromise =
    (async () => {
      try {
        console.log(
          "================================================"
        );

        console.log(
          "STEADFAST FRAUD CHECK"
        );

        console.log({
          phone,
          baseUrl:
            config.baseUrl,
          hasApiKey:
            Boolean(
              config.apiKey
            ),
          hasSecretKey:
            Boolean(
              config.secretKey
            ),
        });

        console.log(
          "================================================"
        );

        const fraudUrl =
          `${config.baseUrl}/fraud_check/${encodeURIComponent(
            phone
          )}`;

        console.log(
          "STEADFAST FRAUD URL:",
          fraudUrl
        );

        const response =
          await axios.get(
            fraudUrl,
            {
              headers: {
                "Api-Key":
                  config.apiKey,

                "Secret-Key":
                  config.secretKey,

                Accept:
                  "application/json",

                "Content-Type":
                  "application/json",
              },

              timeout: 30000,

              // We want to manually handle
              // 400 / 401 / 403 / 404 / 429.
              validateStatus:
                () => true,
            }
          );

        console.log(
          "================================================"
        );

        console.log(
          "STEADFAST FRAUD HTTP STATUS:",
          response.status
        );

        console.log(
          "STEADFAST FRAUD RESPONSE:"
        );

        console.dir(
          response.data,
          {
            depth: null,
          }
        );

        console.log(
          "================================================"
        );

        /* =================================================
           RATE LIMIT
        ================================================= */

        if (
          response.status === 429
        ) {
          throw new Error(
            "SteadFast fraud-check rate limit reached. Please try again later."
          );
        }

        /* =================================================
           HTTP ERROR
        ================================================= */

        if (
          response.status < 200 ||
          response.status >= 300
        ) {
          const apiMessage =
            response?.data
              ?.message ||
            response?.data
              ?.error ||
            response?.data?.msg ||
            `SteadFast returned HTTP ${response.status}`;

          throw new Error(
            apiMessage
          );
        }

        /* =================================================
           RESPONSE ROOT
        ================================================= */

        const root =
          response?.data || {};

        let data = root;

        // If API wraps response in data
        if (
          root?.data &&
          typeof root.data ===
            "object" &&
          !Array.isArray(
            root.data
          )
        ) {
          data = root.data;
        }

        console.log(
          "STEADFAST FRAUD DATA OBJECT:"
        );

        console.dir(
          data,
          {
            depth: null,
          }
        );

        /* =================================================
           TOTAL PARCELS
        ================================================= */

        const totalParcels =
          toSafeNumber(
            data?.Total_parcels ??
              data?.total_parcels ??
              data?.totalParcels ??
              data?.total_orders ??
              data?.Total_orders ??
              data?.totalOrders ??
              data?.parcel_count ??
              data?.parcelCount ??
              0
          );

        /* =================================================
           TOTAL DELIVERED
        ================================================= */

        const totalDelivered =
          toSafeNumber(
            data?.total_delivered ??
              data?.Total_delivered ??
              data?.totalDelivered ??
              data?.delivered ??
              data?.Delivered ??
              data?.delivered_orders ??
              data?.deliveredOrders ??
              0
          );

        /* =================================================
           TOTAL CANCELLED
        ================================================= */

        const totalCancelled =
          toSafeNumber(
            data?.total_cancelled ??
              data?.Total_cancelled ??
              data?.totalCancelled ??
              data?.cancelled ??
              data?.Cancelled ??
              data?.canceled ??
              data?.cancelled_orders ??
              data?.cancelledOrders ??
              0
          );

        /* =================================================
           TOTAL RETURNED
        ================================================= */

        const totalReturned =
          toSafeNumber(
            data?.total_returned ??
              data?.Total_returned ??
              data?.totalReturned ??
              data?.returned ??
              data?.returns ??
              data?.returned_orders ??
              data?.returnedOrders ??
              0
          );

        /* =================================================
           FRAUD REPORTS
        ================================================= */

        let totalFraudReports =
          [];

        const fraudReportValue =
          data?.total_fraud_reports ??
          data?.Total_fraud_reports ??
          data?.totalFraudReports ??
          data?.fraud_reports ??
          data?.fraudReports ??
          data?.fraud_report_count ??
          data?.fraudReportCount ??
          0;

        // Array response
        if (
          Array.isArray(
            fraudReportValue
          )
        ) {
          totalFraudReports =
            fraudReportValue;
        }

        // Number response
        else if (
          typeof fraudReportValue ===
          "number"
        ) {
          const fraudCount =
            Math.max(
              0,
              Math.floor(
                fraudReportValue
              )
            );

          totalFraudReports =
            Array(
              fraudCount
            ).fill({});
        }

        // Numeric string response
        else if (
          typeof fraudReportValue ===
            "string" &&
          fraudReportValue.trim() !==
            ""
        ) {
          const fraudCount =
            Number(
              fraudReportValue
            );

          if (
            Number.isFinite(
              fraudCount
            ) &&
            fraudCount > 0
          ) {
            totalFraudReports =
              Array(
                Math.floor(
                  fraudCount
                )
              ).fill({});
          }
        }

        /* =================================================
           HAS HISTORY
        ================================================= */

        const hasHistory =
          totalParcels > 0 ||
          totalDelivered > 0 ||
          totalCancelled > 0 ||
          totalReturned > 0 ||
          totalFraudReports.length >
            0;

        /* =================================================
           CANCELLATION RATE
        ================================================= */

        const cancellationRate =
          totalParcels > 0
            ? Number(
                (
                  (totalCancelled /
                    totalParcels) *
                  100
                ).toFixed(2)
              )
            : 0;

        /* =================================================
           PARSED RESULT
        ================================================= */

        const parsedResult = {
          phone,

          totalParcels,

          totalDelivered,

          totalCancelled,

          totalReturned,

          totalFraudReports,

          cancellationRate,

          hasHistory,

          raw:
            response.data,
        };

        /* =================================================
           SAVE CACHE
        ================================================= */

        fraudCache.set(
          phone,
          {
            data:
              parsedResult,

            expiresAt:
              Date.now() +
              FRAUD_CACHE_TTL,
          }
        );

        console.log(
          "================================================"
        );

        console.log(
          "STEADFAST FRAUD PARSED RESULT"
        );

        console.log({
          phone,

          totalParcels,

          totalDelivered,

          totalCancelled,

          totalReturned,

          fraudReports:
            totalFraudReports.length,

          cancellationRate,

          hasHistory,
        });

        console.log(
          "================================================"
        );

        return parsedResult;
      } catch (error) {
        console.error(
          "================================================"
        );

        console.error(
          "STEADFAST FRAUD CHECK ERROR"
        );

        console.error(
          "HTTP Status:",
          error?.response?.status
        );

        console.error(
          "SteadFast Response:",
          error?.response?.data
        );

        console.error(
          "Error Message:",
          error?.message
        );

        console.error(
          "================================================"
        );

        throw new Error(
          error?.response
            ?.data?.message ||
            error?.response
              ?.data?.error ||
            error?.message ||
            "Failed to check SteadFast fraud."
        );
      } finally {
        /* ===============================================
           REMOVE RUNNING REQUEST
        =============================================== */

        fraudRequests.delete(
          phone
        );
      }
    })();

  /* =====================================================
     SAVE RUNNING REQUEST
  ===================================================== */

  fraudRequests.set(
    phone,
    requestPromise
  );

  return requestPromise;
};

/* =========================================================
   CALCULATE FRAUD RISK
========================================================= */

export const calculateRiskLevel = ({
  totalParcels = 0,
  totalCancelled = 0,
  totalFraudReports = [],
}) => {
  const parcels =
    toSafeNumber(
      totalParcels
    );

  const cancelled =
    toSafeNumber(
      totalCancelled
    );

  let fraudReportCount = 0;

  /* =====================================================
     FRAUD REPORT COUNT
  ===================================================== */

  if (
    Array.isArray(
      totalFraudReports
    )
  ) {
    fraudReportCount =
      totalFraudReports.length;
  } else {
    fraudReportCount =
      toSafeNumber(
        totalFraudReports
      );
  }

  /* =====================================================
     NO STEADFAST HISTORY

     Order model supports:
     Unknown / Low / Medium / High
  ===================================================== */

  if (parcels <= 0) {
    return "Unknown";
  }

  /* =====================================================
     FRAUD REPORT EXISTS
  ===================================================== */

  if (
    fraudReportCount > 0
  ) {
    return "High";
  }

  /* =====================================================
     CANCELLATION RATE
  ===================================================== */

  const cancellationRatio =
    cancelled / parcels;

  /* 50% or more = High */

  if (
    cancellationRatio >= 0.5
  ) {
    return "High";
  }

  /* 25% - 49.99% = Medium */

  if (
    cancellationRatio >= 0.25
  ) {
    return "Medium";
  }

  /* Less than 25% = Low */

  return "Low";
};

/* =========================================================
   MAP STEADFAST STATUS
========================================================= */

export const mapSteadfastStatus = (
  rawStatus
) => {
  const status = String(
    rawStatus || ""
  )
    .trim()
    .toLowerCase();

  if (
    [
      "delivered",
      "partial_delivered",
      "partial delivered",
    ].includes(status)
  ) {
    return "Delivered";
  }

  if (
    [
      "cancel",
      "cancelled",
      "canceled",
    ].includes(status)
  ) {
    return "Cancelled";
  }

  if (
    [
      "return",
      "returned",
      "returned_to_merchant",
    ].includes(status)
  ) {
    return "Returned";
  }

  if (
    [
      "failed",
      "delivery_failed",
    ].includes(status)
  ) {
    return "Failed";
  }

  if (
    [
      "pending",
      "in_review",
      "created",
    ].includes(status)
  ) {
    return "Pending";
  }

  if (
    [
      "picked",
      "pickup",
      "received",
      "in_transit",
      "transit",
      "hub",
      "rider",
      "assigned",
      "out_for_delivery",
      "delivery",
    ].includes(status)
  ) {
    return "Shipped";
  }

  return "Shipped";
};
