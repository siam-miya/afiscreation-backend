import axios from "axios";

/* =========================================================
   DEFAULT STEADFAST BASE URL
========================================================= */

const DEFAULT_STEADFAST_BASE_URL =
  "https://portal.packzy.com/api/v1";

/* =========================================================
   STEADFAST CONFIG
========================================================= */

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

  if (!baseUrl) {
    throw new Error(
      "SteadFast Base URL is missing."
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
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

  /*
    +8801712345678
    ->
    01712345678
  */

  if (phone.startsWith("+880")) {
    phone = `0${phone.slice(4)}`;
  }

  /*
    8801712345678
    ->
    01712345678
  */

  else if (phone.startsWith("880")) {
    phone = `0${phone.slice(3)}`;
  }

  /*
    Supported Bangladesh mobile prefixes:
    013
    014
    015
    016
    017
    018
    019
  */

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

  if (
    !Number.isFinite(codAmount) ||
    codAmount < 0
  ) {
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
    "STEADFAST CREATE ORDER REQUEST",
    {
      invoice: payload.invoice,
      codAmount: payload.cod_amount,
      totalLot: payload.total_lot,
      baseUrl: config.baseUrl,
    }
  );

  try {
    const response =
      await axios.post(
        `${config.baseUrl}/create_order`,
        payload,
        {
          headers: {
            "Api-Key": config.apiKey,
            "Secret-Key": config.secretKey,
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
          },
          timeout: 30000,
        }
      );

    console.log(
      "STEADFAST CREATE ORDER RESPONSE",
      response.data
    );

    return response.data;
  } catch (error) {
    console.error(
      "STEADFAST CREATE ORDER ERROR:",
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
            "Api-Key": config.apiKey,
            "Secret-Key": config.secretKey,
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
            "Api-Key": config.apiKey,
            "Secret-Key": config.secretKey,
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
   SAFE NUMBER
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

   IMPORTANT:

   Same phone => cached result.

   This prevents repeated SteadFast fraud
   searches for the same phone.

   30 minutes in application memory.
========================================================= */

const FRAUD_CACHE_TTL =
  30 * 60 * 1000;

/*
  phone -> {
    data,
    expiresAt
  }
*/

const fraudCache = new Map();

/*
  phone -> Promise

  Prevents multiple simultaneous
  requests for same phone.
*/

const fraudRequests = new Map();

/* =========================================================
   FRAUD CACHE CLEANUP

   Prevent memory growth from many unique phones.
========================================================= */

const MAX_FRAUD_CACHE_SIZE = 5000;

const cleanupFraudCache = () => {
  const now = Date.now();

  for (
    const [phone, cached] of fraudCache.entries()
  ) {
    if (
      !cached ||
      cached.expiresAt <= now
    ) {
      fraudCache.delete(phone);
    }
  }

  /*
    Emergency protection if cache becomes too large.
  */

  if (
    fraudCache.size >
    MAX_FRAUD_CACHE_SIZE
  ) {
    const entries =
      [...fraudCache.entries()]
        .sort(
          (a, b) =>
            a[1].expiresAt -
            b[1].expiresAt
        );

    const removeCount =
      fraudCache.size -
      MAX_FRAUD_CACHE_SIZE;

    for (
      let i = 0;
      i < removeCount;
      i++
    ) {
      fraudCache.delete(
        entries[i][0]
      );
    }
  }
};

/* =========================================================
   STEADFAST FRAUD CHECK
========================================================= */

export const checkSteadfastFraud = async (
  rawPhone,
  credentials = {}
) => {
  const config =
    getSteadfastConfig(credentials);

  const phone =
    normalizeBdPhone(rawPhone);

  cleanupFraudCache();

  /* =====================================================
     CACHE CHECK
  ===================================================== */

  const cached =
    fraudCache.get(phone);

  if (
    cached &&
    cached.expiresAt > Date.now()
  ) {
    console.log(
      "STEADFAST FRAUD CACHE HIT"
    );

    return cached.data;
  }

  if (cached) {
    fraudCache.delete(phone);
  }

  /* =====================================================
     DUPLICATE REQUEST PROTECTION
  ===================================================== */

  const existingRequest =
    fraudRequests.get(phone);

  if (existingRequest) {
    console.log(
      "STEADFAST FRAUD REQUEST ALREADY RUNNING"
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
          "STEADFAST FRAUD CHECK STARTED"
        );

        const fraudUrl =
          `${config.baseUrl}/fraud_check/score/${encodeURIComponent(
            phone
          )}`;

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
              },

              timeout: 30000,

              /*
                Manually handle API
                status codes.
              */

              validateStatus:
                () => true,
            }
          );

        console.log(
          "STEADFAST FRAUD HTTP STATUS:",
          response.status
        );

        /* =================================================
           RATE LIMIT
        ================================================= */

        if (
          response.status === 429
        ) {
          const rateLimitError =
            new Error(
              "SteadFast fraud-check rate limit reached. Please try again later."
            );

          rateLimitError.statusCode =
            429;

          throw rateLimitError;
        }

        /* =================================================
           AUTH ERRORS
        ================================================= */

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          const authError =
            new Error(
              response?.data?.message ||
                response?.data?.error ||
                "SteadFast authentication failed."
            );

          authError.statusCode =
            response.status;

          throw authError;
        }

        /* =================================================
           OTHER HTTP ERRORS
        ================================================= */

        if (
          response.status < 200 ||
          response.status >= 300
        ) {
          const apiMessage =
            response?.data?.message ||
            response?.data?.error ||
            response?.data?.msg ||
            `SteadFast returned HTTP ${response.status}`;

          const apiError =
            new Error(apiMessage);

          apiError.statusCode =
            response.status;

          throw apiError;
        }

        /* =================================================
           RESPONSE (score endpoint)
        ================================================= */

        const root =
          response?.data || {};

        console.log(
          "STEADFAST FRAUD RAW RESPONSE:",
          JSON.stringify(response.data)
        );

        let data = root;

        if (
          root?.data &&
          typeof root.data === "object" &&
          !Array.isArray(root.data)
        ) {
          data = root.data;
        }

        const deliveryRatio =
          toSafeNumber(
            data?.delivery_ratio ??
              data?.deliveryRatio
          );

        const cancellationRatio =
          toSafeNumber(
            data?.cancellation_ratio ??
              data?.cancellationRatio
          );

        const returnRatio =
          toSafeNumber(
            data?.return_ratio ??
              data?.returnRatio
          );

        const volumeBand = String(
          data?.volume_band ??
            data?.volumeBand ??
            ""
        ).toLowerCase();

        const totalReports =
          toSafeNumber(
            data?.total_reports ??
              data?.totalReports
          );

        const fraudCategories =
          Array.isArray(
            data?.fraud_categories
          )
            ? data.fraud_categories
            : [];

        const doubtfulReports =
          Boolean(
            data?.doubtful_reports
          );

        const reportCount = Math.max(
          totalReports,
          fraudCategories.length
        );

        const totalFraudReports =
          reportCount > 0
            ? Array(
                Math.floor(reportCount)
              ).fill({})
            : [];

        const hasHistory =
          deliveryRatio > 0 ||
          cancellationRatio > 0 ||
          returnRatio > 0 ||
          reportCount > 0 ||
          doubtfulReports;

        const parsedResult = {
          phone,

          /* score endpoint does not return counts */
          totalParcels: 0,
          totalDelivered: 0,
          totalCancelled: 0,
          totalReturned: 0,

          totalFraudReports,

          cancellationRate:
            cancellationRatio,

          deliveryRatio,
          returnRatio,
          volumeBand,
          doubtfulReports,

          hasHistory,

          raw: response.data,
        };

        fraudCache.set(phone, {
          data: parsedResult,
          expiresAt:
            Date.now() +
            FRAUD_CACHE_TTL,
        });

        console.log(
          "STEADFAST FRAUD RESULT",
          {
            deliveryRatio,
            cancellationRatio,
            returnRatio,
            volumeBand,
            fraudReports:
              totalFraudReports.length,
            hasHistory,
          }
        );

        return parsedResult;
      } catch (error) {
        console.error(
          "STEADFAST FRAUD CHECK ERROR:",
          {
            status:
              error?.statusCode ||
              error?.response?.status ||
              null,

            message:
              error?.message,
          }
        );

        throw error;
      } finally {
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
  cancellationRatio,
  hasHistory = false,
  doubtfulReports = false,
}) => {
  const fraudReportCount =
    Array.isArray(totalFraudReports)
      ? totalFraudReports.length
      : toSafeNumber(totalFraudReports);

  /* ---------- ratio based (score endpoint) ---------- */

  if (
    cancellationRatio !== undefined &&
    cancellationRatio !== null
  ) {
    if (
      !hasHistory &&
      fraudReportCount <= 0
    ) {
      return "Unknown";
    }

    if (
      fraudReportCount > 0 ||
      doubtfulReports
    ) {
      return "High";
    }

    const ratio = Number(cancellationRatio) || 0;

    if (ratio >= 50) return "High";
    if (ratio >= 25) return "Medium";

    return "Low";
  }

  /* ---------- count based (old behaviour) ---------- */

  const parcels = toSafeNumber(totalParcels);
  const cancelled = toSafeNumber(totalCancelled);

  if (parcels <= 0) return "Unknown";
  if (fraudReportCount > 0) return "High";

  const ratio = cancelled / parcels;

  if (ratio >= 0.5) return "High";
  if (ratio >= 0.25) return "Medium";

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