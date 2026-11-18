import express from "express";
import { listTransactions } from "../controllers/stock.controller.js";
import {
  allowRoles,
  verifyToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/",
  verifyToken,
  allowRoles("admin", "warehouseManager"),
  listTransactions,
);

export default router;
