import express from "express";
import {
  cancelOrder,
  createOrder,
  getOrder,
  getOrderInvoice,
  listOrders,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import {
  allowRoles,
  verifyToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);
router.post("/", allowRoles("salesRepresentative"), createOrder);
router.get(
  "/",
  allowRoles("admin", "warehouseManager", "salesRepresentative"),
  listOrders,
);
router.get(
  "/:id",
  allowRoles("admin", "warehouseManager", "salesRepresentative"),
  getOrder,
);
router.get(
  "/:id/invoice",
  allowRoles("admin", "warehouseManager", "salesRepresentative"),
  getOrderInvoice,
);
router.patch("/:id/status", allowRoles("admin", "warehouseManager"), updateOrderStatus);
router.put("/:id/status", allowRoles("admin", "warehouseManager"), updateOrderStatus);
router.patch(
  "/:id/cancel",
  allowRoles("admin", "warehouseManager", "salesRepresentative"),
  cancelOrder,
);
router.put(
  "/:id/cancel",
  allowRoles("admin", "warehouseManager", "salesRepresentative"),
  cancelOrder,
);

export default router;
