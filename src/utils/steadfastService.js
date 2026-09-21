import axios from "axios";

const DEFAULT_STEADFAST_BASE_URL =
  "https://portal.packzy.com/api/v1";

/* =========================================================
   GET STEADFAST CONFIG
========================================================= */
const getSteadfastConfig = (credentials = {}) => {
  const baseUrl =
    String(
      credentials?.baseUrl ||
        DEFAULT_STEADFAST_BASE_URL
    ).trim();

  const apiKey = String(
    credentials?.apiKey || ""
  ).trim();

  const secretKey = String(
    credentials?.secretKey || ""
  ).trim();

  console.log("STEADFAST CONFIG CHECK:", {
    baseUrl,
    hasApiKey: Boolean(apiKey),
    hasSecretKey: Boolean(secretKey),
  });

  if (!baseUrl) {
    throw new Error("SteadFast Base URL is missing.");
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(baseUrl);
  } catch (error) {
    throw new Error("Invalid SteadFast Base URL.");
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      "SteadFast Base URL must use HTTPS."
    );
  }

  if (!apiKey) {
    throw new Error("SteadFast API Key is missing.");
  }

  if (!secretKey) {
    throw new Error(
      "SteadFast Secret Key is missing."
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
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

  if (phone.startsWith("+880")) {
    phone = `0${phone.slice(4)}`;
  } else if (phone.startsWith("880")) {
    phone = `0${phone.slice(3)}`;
  }

  if (!/^01[3-9]\d{8}$/.test(phone)) {
    throw new Error(
      "Invalid Bangladeshi phone number."
    );
  }

  return phone;
};


/* =========================================================
   SEND ORDER TO STEADFAST
========================================================= */
export const sendOrderToSteadfastAPI = async (
  order,
  credentials = {}
) => {
  const config = getSteadfastConfig(credentials);

  const invoice =
    order?.orderId ||
    String(order?._id || "");

  const recipientName =
    order?.fullName ||
    order?.customerName ||
    "";

  const recipientPhone = normalizeBdPhone(
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

  const cartItems = Array.isArray(order?.cart)
    ? order.cart
    : Array.isArray(order?.items)
    ? order.items
    : [];

  const totalLot = cartItems.reduce(
    (total, item) =>
      total +
      Number(
        item?.quantity ||
          item?.qty ||
          1
      ),
    0
  );

  const itemDescription = cartItems
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
      itemDescription || "E-commerce Order",
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
    const response = await axios.post(
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
      "STEADFAST CREATE ORDER RESPONSE"
    );

    console.log(response.data);

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
  const config = getSteadfastConfig(credentials);

  if (!consignmentId) {
    throw new Error(
      "SteadFast consignment ID is missing."
    );
  }

  try {
    const response = await axios.get(
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
  const config = getSteadfastConfig(credentials);

  try {
    const response = await axios.get(
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
   STEADFAST FRAUD CHECK
========================================================= */
export const checkSteadfastFraud = async (
  rawPhone,
  credentials = {}
) => {
  const config = getSteadfastConfig(
    credentials
  );

  const phone =
    normalizeBdPhone(rawPhone);

  console.log(
    "================================================"
  );

  console.log(
    "STEADFAST FRAUD CHECK"
  );

  console.log({
    phone,
    baseUrl: config.baseUrl,
    hasApiKey:
      Boolean(config.apiKey),
    hasSecretKey:
      Boolean(config.secretKey),
  });

  console.log(
    "================================================"
  );

  try {
    const response = await axios.get(
      `${config.baseUrl}/fraud_check/${encodeURIComponent(
        phone
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

    console.log(
      "STEADFAST FRAUD RESPONSE:"
    );

    console.log(response.data);

    const data =
      response?.data?.data ||
      response?.data ||
      {};

    const totalParcels = Number(
      data?.Total_parcels ??
        data?.total_parcels ??
        0
    );

    const totalDelivered = Number(
      data?.total_delivered ??
        data?.Total_delivered ??
        0
    );

    const totalCancelled = Number(
      data?.total_cancelled ??
        data?.Total_cancelled ??
        0
    );

    const totalFraudReports =
      Array.isArray(
        data?.total_fraud_reports
      )
        ? data.total_fraud_reports
        : Array.isArray(
            data?.Total_fraud_reports
          )
        ? data.Total_fraud_reports
        : [];

    return {
      phone,
      totalParcels,
      totalDelivered,
      totalCancelled,
      totalFraudReports,
      raw: response.data,
    };
  } catch (error) {
    console.error(
      "STEADFAST FRAUD CHECK ERROR"
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
        "Failed to check SteadFast fraud."
    );
  }
};


/* =========================================================
   CALCULATE FRAUD RISK
========================================================= */
export const calculateRiskLevel = ({
  totalParcels = 0,
  totalCancelled = 0,
  totalFraudReports = [],
}) => {
  const parcels = Number(
    totalParcels || 0
  );

  const cancelled = Number(
    totalCancelled || 0
  );

  const fraudReports =
    Array.isArray(totalFraudReports)
      ? totalFraudReports
      : [];

  if (fraudReports.length > 0) {
    return "High";
  }

  if (parcels === 0) {
    return "Unverified";
  }

  const cancellationRatio =
    cancelled / parcels;

  if (cancellationRatio >= 0.5) {
    return "High";
  }

  if (cancellationRatio >= 0.25) {
    return "Medium";
  }

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