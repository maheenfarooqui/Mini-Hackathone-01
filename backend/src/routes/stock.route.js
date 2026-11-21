import express from "express";
import {
  changeStock,
  listLowStock,
  listStock,
  listTransactions,
  transferStock,
} from "../controllers/stock.controller.js";
import {
  allowRoles,
  verifyToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);
router.post(
  "/in",
  allowRoles("admin", "warehouseManager"),
  (req, res) => changeStock(req, res, "stock-in"),
);
router.post(
  "/out",
  allowRoles("admin", "warehouseManager"),
  (req, res) => changeStock(req, res, "stock-out"),
);
router.post(
  "/transfer",
  allowRoles("admin", "warehouseManager"),
  transferStock,
);
router.get(
  "/low",
  allowRoles("admin", "warehouseManager", "salesRepresentative"),
  listLowStock,
);
router.get(
  "/transactions",
  allowRoles("admin", "warehouseManager"),
  listTransactions,
);
router.get(
  "/",
  allowRoles("admin", "warehouseManager", "salesRepresentative"),
  listStock,
);

export default router;
