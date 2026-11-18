
import express from "express";
import {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";

import {
  verifyToken,
  adminOnly,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// Customer routes
router.post("/create", verifyToken, createOrder);
router.get("/my-orders", verifyToken, getMyOrders);

// Admin routes
router.get("/admin/all", verifyToken, adminOnly, getAllOrders);
router.patch(
  "/admin/:id/status",
  verifyToken,
  adminOnly,
  updateOrderStatus
);

export default router;
