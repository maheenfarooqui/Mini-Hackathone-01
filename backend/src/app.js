import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import passport from "./config/passport.js";
import connectDb from "./db/db.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import productRoute from "./routes/product.route.js";
import warehouseRoute from "./routes/warehouse.route.js";
import stockRoute from "./routes/stock.route.js";
import orderRoute from "./routes/order.route.js";
import supplierRoute from "./routes/supplier.route.js";
import supplyRequestRoute from "./routes/supplyRequest.route.js";
import dashboardRoute from "./routes/dashboard.route.js";
import imagekitRoute from "./routes/imagekit.route.js";
import transactionRoute from "./routes/transaction.route.js";

const app = express();
const allowedOrigins = new Set([
  "https://al-nahal.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.FRONTEND_URL,
].filter(Boolean));

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(passport.initialize());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDb();
    }
    return next();
  } catch (error) {
    console.error("Database connection failed:", error);
    return res.status(503).json({
      success: false,
      message: "Database is unavailable.",
    });
  }
});

app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/products", productRoute);
app.use("/api/warehouses", warehouseRoute);
app.use("/api/stock", stockRoute);
app.use("/api/transactions", transactionRoute);
app.use("/api/orders", orderRoute);
app.use("/api/suppliers", supplierRoute);
app.use("/api/supply-requests", supplyRequestRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/imagekit", imagekitRoute);

app.use((req, res) => {
  return res.status(404).json({ message: "API endpoint not found." });
});

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);
  if (res.headersSent) return next(error);

  const status = error.status || error.statusCode || 500;
  return res.status(status).json({
    message:
      status === 413
        ? "Request body is too large."
        : status === 400
          ? "Invalid request."
          : "Internal server error.",
  });
});

export default app;
