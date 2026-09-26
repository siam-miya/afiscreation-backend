import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";

import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import aboutRoutes from "./routes/aboutRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import courierRoutes from "./routes/courierRoutes.js";
import fraudRoutes from "./routes/fraudRoutes.js";
import shippingZoneRoutes from "./routes/shippingZoneRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();

/* =========================
   BASIC SECURITY
========================= */

app.disable("x-powered-by");

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/* =========================
   SECURITY HEADERS
========================= */

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

/* =========================
   CORS
========================= */

const allowedOrigins = (
  process.env.CLIENT_URL ||
  "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin header.
      // Example: Postman, server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("CORS origin not allowed.")
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/* =========================
   BODY PARSER
========================= */

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

/* =========================
   COOKIE PARSER
========================= */

app.use(cookieParser());

/* =========================
   LOGGING
========================= */

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

/* =========================
   STATIC FILES
========================= */

app.use(
  "/uploads",
  express.static(
    path.join(process.cwd(), "uploads")
  )
);

/* =========================
   API ROUTES
========================= */

/* Products */

app.use(
  "/api/products",
  productRoutes
);

/* Authentication */

app.use(
  "/api/v1/auth",
  authRoutes
);

/* Categories */

app.use(
  "/api/v1/categories",
  categoryRoutes
);

/* About */

app.use(
  "/api/about",
  aboutRoutes
);

/* Contact */

app.use(
  "/api/contact",
  contactRoutes
);

/* Orders */

app.use(
  "/api/orders",
  orderRoutes
);

/* Courier */

app.use(
  "/api/courier",
  courierRoutes
);

/* Fraud */

app.use(
  "/api/fraud",
  fraudRoutes
);

/* Shipping Zones */

app.use(
  "/api/v1/shipping-zones",
  shippingZoneRoutes
);

/* Banners */

app.use(
  "/api/banners",
  bannerRoutes
);

/* Settings */

app.use(
  "/api/settings",
  settingsRoutes
);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

app.use((err, req, res, next) => {
  console.error(
    "SERVER ERROR:",
    err.message
  );

  if (
    err.message ===
    "CORS origin not allowed."
  ) {
    return res.status(403).json({
      success: false,
      message: "CORS origin not allowed.",
    });
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "File is too large. Maximum size is 2MB.",
      });
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message:
          "Only one file can be uploaded at a time.",
      });
    }

    return res.status(400).json({
      success: false,
      message: "File upload failed.",
    });
  }

  if (
    err.message?.includes(
      "Only JPG, JPEG, PNG and WEBP"
    )
  ) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (
    err instanceof SyntaxError &&
    err.status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON payload.",
    });
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 600
      ? err.statusCode
      : 500;

  if (process.env.NODE_ENV === "production") {
    return res.status(statusCode).json({
      success: false,
      message:
        statusCode === 500
          ? "Something went wrong."
          : err.message || "Request failed.",
    });
  }

  return res.status(statusCode).json({
    success: false,
    message:
      err.message || "Something went wrong.",
  });
});

export default app;