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
import courierRoutes from './routes/courierRoutes.js';
import fraudRoutes from "./routes/fraudRoutes.js";
import shippingZoneRoutes from "./routes/shippingZoneRoutes.js";
import bannerRoutes from "./routes/bannerRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
// import settingsRoutes from "./routes/settingsRoutes.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));

app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));


app.use(cookieParser());
app.use(express.json());
app.use(morgan("dev"));

// স্ট্যাটিক ফোল্ডার রাউট
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use("/api/products", productRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes); 
app.use('/api/about', aboutRoutes);
app.use('/api/contact', contactRoutes);
app.use("/api/orders", orderRoutes);
app.use('/api/courier', courierRoutes);
app.use("/api/fraud", fraudRoutes);
app.use("/api/v1/shipping-zones", shippingZoneRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/settings", settingsRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ success: false, message: err.message });
});

export default app;