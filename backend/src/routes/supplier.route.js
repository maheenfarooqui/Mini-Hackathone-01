import express from "express";
import {
  getSupplierProfile,
  listSuppliers,
  updateSupplierProfile,
} from "../controllers/supplier.controller.js";
import {
  adminOnly,
  allowRoles,
  verifyToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);
router.get("/", adminOnly, listSuppliers);
router.get("/me", allowRoles("supplier"), getSupplierProfile);
router.patch("/me", allowRoles("supplier"), updateSupplierProfile);

export default router;
