import express from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
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
  "/:id",
  allowRoles("admin", "warehouseManager", "supplier", "salesRepresentative"),
  getProduct,
);
router.post("/", adminOnly, createProduct);
router.put("/:id", adminOnly, updateProduct);
router.delete("/:id", adminOnly, deleteProduct);

export default router;
