import express from "express";
import {
  addProduct,
  fetchProduct,
  fetchSingleProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { verifyToken, adminOnly } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post(
  "/create",
  verifyToken,
  adminOnly,
  upload.single("image"),
  addProduct,
);
router.put("/edit/:id", verifyToken, adminOnly,upload.single("image"), updateProduct);
router.delete("/delete/:id", verifyToken, adminOnly, deleteProduct);
router.get("/fetch", fetchProduct);
router.get("/fetch/:id", fetchSingleProduct);

export default router;
