import axios from "axios";

const tokenCache = new Map();

const getCacheKey = (credentials) => {
  const clientId = String(credentials?.clientId || "").trim();
  const username = String(credentials?.username || "").trim();
  return `${clientId}::${username}`;
};

const getPathaoBaseUrl = (credentials) => {
  const baseUrl = String(
    credentials?.baseUrl || ""
  ).trim();

  if (!baseUrl) {
    throw new Error(
      "Pathao API Base URL is missing."
    );
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new Error(
      "Invalid Pathao API Base URL."
    );
  }

  if (parsedUrl.protocol !== "https:") {
    throw new Error(
      "Pathao API Base URL must use HTTPS."
    );
  }

  return parsedUrl.href.replace(/\/+$/, "");
};

export const getPathaoAccessToken = async (
  credentials,
  { forceRefresh = false } = {}
) => {
  const cacheKey = getCacheKey(credentials);
  if (!forceRefresh) {
    const cached = tokenCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return cached.data;
    }
  }

  try {
    const clientId = String(
      credentials?.clientId || ""
    ).trim();

    const clientSecret = String(
      credentials?.clientSecret || ""
    ).trim();

    const username = String(
      credentials?.username || ""
    ).trim();

    const password = String(
      credentials?.password || ""
    ).trim();

    if (!clientId) {
      throw new Error(
        "Pathao Client ID is missing."
      );
    }

    if (!clientSecret) {
      throw new Error(
        "Pathao Client Secret is missing."
      );
    }

    if (!username) {
      throw new Error(
        "Pathao Username is missing."
      );
    }

    if (!password) {
      throw new Error(
        "Pathao Password is missing."
      );
    }

    const baseUrl =
      getPathaoBaseUrl(credentials);

    const tokenUrl =
      `${baseUrl}/aladdin/api/v1/issue-token`;

    console.log(
      "========================================"
    );

    console.log(
      "PATHAO TOKEN REQUEST"
    );

    console.log({
      tokenUrl,
      clientId,
      username,
      hasClientSecret: Boolean(clientSecret),
      hasPassword: Boolean(password),
      grant_type: "password",
    });

    console.log(
      "========================================"
    );

    const response = await axios.post(
      tokenUrl,
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "password",
        username: username,
        password: password,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },

        timeout: 20000,
      }
    );

    const responseBody =
      response?.data || {};

    const data =
      responseBody?.data ||
      responseBody;

    if (!data?.access_token) {
      console.error(
        "Pathao Token Response:",
        responseBody
      );

      throw new Error(
        "Pathao did not return an access token."
      );
    }

    console.log(
      "Pathao Access Token received successfully."
    );

    // -------------------------------------------------
    // Cache it. expires_in is in seconds (fallback to
    // 3600s / 1hr if Pathao doesn't send it for some reason).
    // -------------------------------------------------
    const expiresInSeconds =
      Number(data.expires_in) > 0
        ? Number(data.expires_in)
        : 3600;

    tokenCache.set(cacheKey, {
      data,
      expiresAt:
        Date.now() + expiresInSeconds * 1000,
    });

    return data;

  } catch (error) {
    const status =
      error?.response?.status;

    const pathaoError =
      error?.response?.data;

    console.error(
      "========================================"
    );

    console.error(
      "PATHAO TOKEN ERROR"
    );

    console.error(
      "HTTP Status:",
      status || "N/A"
    );

    console.error(
      "Pathao Response:",
      pathaoError || error.message
    );

    console.error(
      "========================================"
    );
    tokenCache.delete(cacheKey);

    const message =
      pathaoError?.message ||
      pathaoError?.error ||
      error.message ||
      "Failed to get Pathao access token.";

    throw new Error(
      `Pathao Token Error: ${message}`
    );
  }
};

const callPathaoWithAuth = async (
  credentials,
  requestFn
) => {
  let tokenData = await getPathaoAccessToken(credentials);
  let accessToken = tokenData?.access_token;

  if (!accessToken) {
    throw new Error(
      "Pathao access token was not received."
    );
  }

  try {
    return await requestFn(accessToken);
  } catch (error) {
    const status = error?.response?.status;

    if (status === 401) {
      console.warn(
        "Pathao returned 401, refreshing token and retrying once..."
      );

      tokenData = await getPathaoAccessToken(credentials, {
        forceRefresh: true,
      });

      accessToken = tokenData?.access_token;

      if (!accessToken) {
        throw new Error(
          "Pathao access token was not received."
        );
      }

      return await requestFn(accessToken);
    }

    throw error;
  }
};
export const sendOrderToPathaoAPI = async (
  order,
  credentials
) => {
  try {
    const baseUrl =
      getPathaoBaseUrl(credentials);

    if (!credentials?.storeId) {
      throw new Error(
        "Pathao Store ID is missing."
      );
    }

    const storeId =
      Number(credentials.storeId);

    if (
      !Number.isInteger(storeId) ||
      storeId <= 0
    ) {
      throw new Error(
        "Pathao Store ID is invalid."
      );
    }

    const recipientAddress =
      String(
        order?.streetAddress || ""
      ).trim();

    if (!recipientAddress) {
      throw new Error(
        "Customer delivery address is missing."
      );
    }

    const recipientName =
      String(
        order?.fullName || ""
      ).trim();

    if (!recipientName) {
      throw new Error(
        "Customer name is missing."
      );
    }

    const rawPhone = String(
      order?.phoneNumber || ""
    ).trim();

    if (!rawPhone) {
      throw new Error(
        "Customer phone number is missing."
      );
    }

    let recipientPhone = rawPhone.replace(
      /[\s\-()]/g,
      ""
    );

    if (recipientPhone.startsWith("+880")) {
      recipientPhone =
        "0" + recipientPhone.slice(4);
    } else if (recipientPhone.startsWith("880")) {
      recipientPhone =
        "0" + recipientPhone.slice(3);
    }

    const bdPhoneRegex = /^01[3-9]\d{8}$/;

    if (!bdPhoneRegex.test(recipientPhone)) {
      throw new Error(
        `Customer phone number "${rawPhone}" is not a valid Bangladeshi mobile number. Expected format: 01XXXXXXXXX (11 digits).`
      );
    }

    const itemQuantity =
      Array.isArray(order?.cart) &&
      order.cart.length > 0
        ? order.cart.reduce(
            (total, item) =>
              total +
              Number(
                item?.quantity || 1
              ),
            0
          )
        : 1;

    let itemDescription =
      "E-commerce order";

    if (order?.orderNotes) {
      itemDescription =
        String(order.orderNotes).trim();
    } else if (
      Array.isArray(order?.cart) &&
      order.cart.length > 0
    ) {
      itemDescription =
        order.cart
          .map((item) => {
            const title =
              String(
                item?.title ||
                  item?.name ||
                  "Product"
              );

            const quantity =
              Number(
                item?.quantity || 1
              );

            return `${title} x${quantity}`;
          })
          .join(", ");
    }

    const merchantOrderId =
      String(
        order?.orderId ||
          order?._id ||
          ""
      ).trim();

    if (!merchantOrderId) {
      throw new Error(
        "Merchant Order ID is missing."
      );
    }

    const amountToCollect =
      Number(
        order?.totalCost || 0
      );

    if (
      Number.isNaN(amountToCollect) ||
      amountToCollect < 0
    ) {
      throw new Error(
        "Invalid order amount."
      );
    }

    const payload = {
      store_id: storeId,

      merchant_order_id:
        merchantOrderId,

      recipient_name:
        recipientName,

      recipient_phone:
        recipientPhone,

      recipient_address:
        recipientAddress,

      delivery_type: 48,

      item_type: 2,

      item_quantity:
        itemQuantity,

      item_weight: 0.5,

      amount_to_collect:
        amountToCollect,

      item_description:
        itemDescription,
    };

    if (order?.orderNotes) {
      payload.special_instruction =
        String(
          order.orderNotes
        ).trim();
    }

    console.log(
      "========================================"
    );

    console.log(
      "PATHAO CREATE ORDER REQUEST"
    );

    console.log({
      baseUrl,

      orderEndpoint:
        `${baseUrl}/aladdin/api/v1/orders`,

      merchant_order_id:
        payload.merchant_order_id,

      store_id:
        payload.store_id,

      recipient_name:
        payload.recipient_name,

      recipient_phone:
        payload.recipient_phone,

      recipient_address:
        payload.recipient_address,

      amount_to_collect:
        payload.amount_to_collect,

      item_quantity:
        payload.item_quantity,
    });

    console.log(
      "========================================"
    );

    const response = await callPathaoWithAuth(
      credentials,
      (accessToken) =>
        axios.post(
          `${baseUrl}/aladdin/api/v1/orders`,
          payload,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            timeout: 30000,
          }
        )
    );

    const responseBody =
      response?.data || {};

    const result =
      responseBody?.data ||
      responseBody ||
      {};

    console.log(
      "Pathao Order Created Successfully:",
      result
    );

    return {
      ...result,

      rawResponse:
        responseBody,
    };

  } catch (error) {
    const status =
      error?.response?.status;

    const pathaoError =
      error?.response?.data;

    console.error(
      "========================================"
    );

    console.error(
      "PATHAO CREATE ORDER ERROR"
    );

    console.error(
      "HTTP Status:",
      status || "N/A"
    );

    console.error(
      "Pathao Response:",
      pathaoError || error.message
    );

    if (
      pathaoError?.errors &&
      typeof pathaoError.errors ===
        "object"
    ) {
      console.error(
        "Pathao Validation Errors:",
        JSON.stringify(
          pathaoError.errors,
          null,
          2
        )
      );
    }

    console.error(
      "========================================"
    );

    const message =
      pathaoError?.message ||
      pathaoError?.error ||
      error.message ||
      "Failed to create Pathao order.";

    throw new Error(
      `Pathao Create Order Error: ${message}`
    );
  }
};

export const getPathaoOrderStatus = async (
  consignmentId,
  credentials
) => {
  try {
    if (!consignmentId) {
      throw new Error(
        "Pathao consignment ID is required."
      );
    }

    const baseUrl =
      getPathaoBaseUrl(credentials);

    const statusUrl =
      `${baseUrl}/aladdin/api/v1/orders/${encodeURIComponent(
        consignmentId
      )}/info`;
    const response = await callPathaoWithAuth(
      credentials,
      (accessToken) =>
        axios.get(
          statusUrl,
          {
            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              Accept:
                "application/json",
            },

            timeout: 20000,
          }
        )
    );

    return (
      response?.data?.data ||
      response?.data ||
      {}
    );

  } catch (error) {
    const pathaoError =
      error?.response?.data;

    console.error(
      "Pathao Status Error:",
      pathaoError ||
        error.message
    );

    const message =
      pathaoError?.message ||
      pathaoError?.error ||
      error.message ||
      "Failed to get Pathao order status.";

    throw new Error(
      `Pathao Status Error: ${message}`
    );
  }
};

export const mapCourierStatus = (
  courierStatus
) => {
  const status =
    String(
      courierStatus || ""
    )
      .toLowerCase()
      .trim();

  if (
    status.includes("delivered")
  ) {
    return "Delivered";
  }

  if (
    status.includes("cancel")
  ) {
    return "Cancelled";
  }

  if (
    status.includes("return") ||
    status.includes("reversed")
  ) {
    return "Returned";
  }

  if (
    status.includes("failed")
  ) {
    return "Failed";
  }

  if (
    status.includes("pending") ||
    status.includes("created")
  ) {
    return "Ready To Ship";
  }

  if (
    status.includes("rider") ||
    status.includes("assigned") ||
    status.includes(
      "out for delivery"
    ) ||
    status.includes("transit") ||
    status.includes("warehouse") ||
    status.includes("hub") ||
    status.includes("received") ||
    status.includes("dispatch") ||
    status.includes("shipment")
  ) {
    return "Shipped";
  }

  return "Shipped";
};