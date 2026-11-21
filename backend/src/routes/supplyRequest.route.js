import express from "express";
import {
  createSupplyRequest,
  listSupplyRequests,
  reviewSupplyRequest,
} from "../controllers/supplier.controller.js";
import {
  allowRoles,
  verifyToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", allowRoles("admin", "warehouseManager", "supplier"), listSupplyRequests);
router.post("/", allowRoles("supplier"), createSupplyRequest);
router.patch("/:id/review", allowRoles("admin", "warehouseManager"), reviewSupplyRequest);
router.put("/:id/status", allowRoles("admin", "warehouseManager"), reviewSupplyRequest);

export default router;
