import express from "express";
import {
  createSupplyRequest,
  listSupplyRequests,
  reviewSupplyRequest,
} from "../controllers/supplier.controller.js";
import {
  adminOnly,
  allowRoles,
  verifyToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", allowRoles("admin", "supplier"), listSupplyRequests);
router.post("/", allowRoles("supplier"), createSupplyRequest);
router.patch("/:id/review", adminOnly, reviewSupplyRequest);

export default router;
