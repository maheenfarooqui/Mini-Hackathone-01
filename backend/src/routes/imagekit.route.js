import express from "express";
import {
  deleteImageKitFile,
  getImageKitAuthentication,
} from "../controllers/imagekit.controller.js";
import {
  adminOnly,
  verifyToken,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/auth", verifyToken, getImageKitAuthentication);
router.delete("/files/:fileId", verifyToken, adminOnly, deleteImageKitFile);

export default router;
