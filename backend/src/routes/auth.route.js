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

const router = express.Router();

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

router.post("/register", registerUser);
router.post("/login", loginUser);
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
