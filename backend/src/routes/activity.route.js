import express from "express";
import { listActivity } from "../controllers/activity.controller.js";
import { adminOnly, verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", verifyToken, adminOnly, listActivity);

export default router;
