import express from "express";
import {
  createUser,
  deleteUser,
  listUsers,
  updateOwnProfile,
  updateUser,
} from "../controllers/user.controller.js";
import { adminOnly, verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);
router.patch("/me/profile", updateOwnProfile);
router.get("/", adminOnly, listUsers);
router.post("/", adminOnly, createUser);
router.put("/:id", adminOnly, updateUser);
router.delete("/:id", adminOnly, deleteUser);

export default router;
