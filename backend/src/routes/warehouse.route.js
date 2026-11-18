import express from "express";
import {
  createWarehouse,
  deleteWarehouse,
  getWarehouse,
  listWarehouses,
  updateWarehouse,
} from "../controllers/warehouse.controller.js";
import {
  adminOnly,
  allowRoles,
  verifyToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);
router.get(
  "/",
  allowRoles("admin", "warehouseManager", "supplier", "salesRepresentative"),
  listWarehouses,
);
router.get(
  "/:id",
  allowRoles("admin", "warehouseManager", "supplier", "salesRepresentative"),
  getWarehouse,
);
router.post("/", adminOnly, createWarehouse);
router.put("/:id", adminOnly, updateWarehouse);
router.delete("/:id", adminOnly, deleteWarehouse);

export default router;
