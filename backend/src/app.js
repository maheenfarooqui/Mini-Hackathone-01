import express from "express";
import cookieParser from "cookie-parser";
import authRoute from "./routes/auth.route.js";
import productRoute from "./routes/product.route.js";
import cartRoute from "./routes/cart.route.js";
import orderRoute from "./routes/order.route.js";
import postRoute from "./routes/post.route.js";
import contactRoute from "./routes/contact.route.js";
import passport from "./config/passport.js";
import cors from "cors";
import mongoose from "mongoose";
import connectDb from "./db/db.js";
import helmet from "helmet";

const app = express();
app.use(helmet());
let dbConnected = false;

app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      await connectDb();
    }

    dbConnected = true;
    next();
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

app.use(
  cors({
    origin: [
      "https://al-nahal.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);


app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());


app.use("/api/auth", authRoute);
app.use("/api/product", productRoute);
app.use("/api/cart", cartRoute);
app.use("/api/orders", orderRoute);
app.use("/api/contact", contactRoute);
app.use("/api/posts", postRoute)

export default app;
