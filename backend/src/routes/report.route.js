import express from "express";
import {
  monthlySales,
  stockMovementReport,
  topProducts,
} from "../controllers/report.controller.js";
import { allowRoles, verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken, allowRoles("admin", "warehouseManager"));
router.get("/sales-monthly", monthlySales);
router.get("/stock-movement", stockMovementReport);
router.get("/top-products", topProducts);

export default router;
