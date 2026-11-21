import express from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProductBySku,
  listProductCategories,
  listProducts,
  updateProduct,
} from "../controllers/product.controller.js";
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
  listProducts,
);
router.get(
  "/categories",
  allowRoles("admin", "warehouseManager", "supplier", "salesRepresentative"),
  listProductCategories,
);
router.get(
  "/sku/:sku",
  allowRoles("admin", "warehouseManager", "supplier", "salesRepresentative"),
  getProductBySku,
);
router.get(
  "/:id",
  allowRoles("admin", "warehouseManager", "supplier", "salesRepresentative"),
  getProduct,
);
router.post("/", allowRoles("admin", "warehouseManager"), createProduct);
router.put("/:id", allowRoles("admin", "warehouseManager"), updateProduct);
router.delete("/:id", adminOnly, deleteProduct);

export default router;
