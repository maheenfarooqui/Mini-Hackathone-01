import express from "express";
import passport from "passport";
import {
  registerUser,
  loginUser,
  logoutUser,
  currentUser,
  googleAuthCallback
} from "../controllers/auth.controller.js";

import { verifyToken } from "../middlewares/auth.middleware.js";
import rateLimit from "express-rate-limit";

const router = express.Router();
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

function googleOAuthRequired(req, res, next) {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_CALLBACK_URL
  ) {
    return res.status(503).json({
      message: "Google sign-in is not configured.",
    });
  }
  return next();
}

router.post("/register", authRateLimit, registerUser);
router.post("/login", authRateLimit, loginUser);
router.post("/logout", logoutUser);
router.get("/me", verifyToken, currentUser);
router.get(
  "/google",
  googleOAuthRequired,
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  googleOAuthRequired,
  passport.authenticate("google", {
    session: false,
  }),
  googleAuthCallback
);

export default router;
