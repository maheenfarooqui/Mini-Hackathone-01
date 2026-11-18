
import express from "express";
import { createContact } from "../controllers/contact.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", (req, res, next) => {
  // Login optional: valid token ho to user attach hoga.
  // Guest request bhi allowed hai.
  if (!req.cookies?.token) {
    return next();
  }

  return verifyToken(req, res, next);
}, createContact);

export default router;
