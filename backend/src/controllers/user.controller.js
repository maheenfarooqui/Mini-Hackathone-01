import bcrypt from "bcrypt";
import mongoose from "mongoose";
import userModel from "../models/user.model.js";
import Warehouse from "../models/warehouse.model.js";
import productModel from "../models/product.model.js";
import orderModel from "../models/order.model.js";
import stockTransactionModel from "../models/stockTransaction.model.js";
import supplyRequestModel from "../models/supplyRequest.model.js";
import {
  cleanupImageKitAsset,
  cleanupReplacedImageKitAsset,
  verifyImageKitAsset,
} from "../../services/storage.service.js";
import { logActivity } from "../utils/logActivity.js";

const roles = ["admin", "warehouseManager", "supplier", "salesRepresentative"];

function validRole(role) {
  return roles.includes(role);
}

function parseAssignedWarehouses(value) {
  if (!Array.isArray(value) || value.some((id) => !mongoose.isValidObjectId(id))) {
    return null;
  }

  return value;
}

export async function listUsers(req, res) {
  try {
    const filter = {};
    if (req.query.role) {
      if (!validRole(req.query.role)) {
        return res.status(400).json({ message: "Invalid user role." });
      }
      filter.role = req.query.role;
    }

    const users = await userModel
      .find(filter)
      .select("-password -googleId")
      .populate("assignedWarehouses", "name location")
      .sort({ createdAt: -1 });

    return res.status(200).json({ count: users.length, users });
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({ message: "Unable to fetch users." });
  }
}

export async function createUser(req, res) {
  try {
    const { name, email, password, phone = "", role } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      password.length < 8 ||
      !validRole(role)
    ) {
      return res.status(400).json({
        message: "Name, email, an 8-character password, and a valid role are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await userModel.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }

    const user = await userModel.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: typeof phone === "string" ? phone.trim() : "",
      password: await bcrypt.hash(password, 12),
      role,
    });
    await logActivity(req, "create", "user", user._id, { role: user.role });

    return res.status(201).json({
      message: "User created successfully.",
      user: await userModel
        .findById(user._id)
        .select("-password -googleId"),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    console.error("Create user error:", error);
    return res.status(500).json({ message: "Unable to create user." });
  }
}

export async function updateUser(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const { name, email, phone, password, role, assignedWarehouses } =
      req.body || {};

    if (role !== undefined && !validRole(role)) {
      return res.status(400).json({ message: "Invalid user role." });
    }
    if (
      user.role === "admin" &&
      role !== undefined &&
      role !== "admin" &&
      (await userModel.countDocuments({ role: "admin" })) <= 1
    ) {
      return res.status(409).json({
        message: "The last administrator account cannot be demoted.",
      });
    }

    let warehouseIds;
    if (assignedWarehouses !== undefined) {
      warehouseIds = parseAssignedWarehouses(assignedWarehouses);
      if (!warehouseIds || (role || user.role) !== "warehouseManager") {
        return res.status(400).json({
          message: "Only warehouse managers can be assigned valid warehouse IDs.",
        });
      }
      const count = await Warehouse.countDocuments({ _id: { $in: warehouseIds } });
      if (count !== new Set(warehouseIds.map(String)).size) {
        return res.status(400).json({ message: "One or more warehouses do not exist." });
      }
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      user.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return res.status(400).json({ message: "Email cannot be empty." });
      }
      user.email = email.trim().toLowerCase();
    }

    if (phone !== undefined) {
      user.phone = typeof phone === "string" ? phone.trim() : "";
    }

    if (password !== undefined) {
      if (typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters." });
      }
      user.password = await bcrypt.hash(password, 12);
    }

    if (role !== undefined) user.role = role;
    if (warehouseIds) user.assignedWarehouses = warehouseIds;
    if (user.role !== "warehouseManager") user.assignedWarehouses = [];

    await user.save();
    await logActivity(req, "update", "user", user._id, { role: user.role });

    await Warehouse.updateMany({ manager: user._id }, { $unset: { manager: 1 } });
    if (user.role === "warehouseManager" && user.assignedWarehouses.length) {
      await userModel.updateMany(
        {
          _id: { $ne: user._id },
          assignedWarehouses: { $in: user.assignedWarehouses },
        },
        { $pull: { assignedWarehouses: { $in: user.assignedWarehouses } } },
      );
      await Warehouse.updateMany(
        { _id: { $in: user.assignedWarehouses } },
        { $set: { manager: user._id } },
      );
    }

    return res.status(200).json({
      message: "User updated successfully.",
      user: await userModel
        .findById(user._id)
        .select("-password -googleId")
        .populate("assignedWarehouses", "name location"),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "An account with this email already exists." });
    }
    console.error("Update user error:", error);
    return res.status(500).json({ message: "Unable to update user." });
  }
}

export async function deleteUser(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    const user = await userModel.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (
      user.role === "admin" &&
      (await userModel.countDocuments({ role: "admin" })) <= 1
    ) {
      return res.status(409).json({
        message: "The last administrator account cannot be deleted.",
      });
    }

    const [products, orders, transactions, requests] = await Promise.all([
      productModel.exists({
        $or: [{ supplier: user._id }, { createdBy: user._id }],
      }),
      orderModel.exists({ createdBy: user._id }),
      stockTransactionModel.exists({ performedBy: user._id }),
      supplyRequestModel.exists({
        $or: [{ supplier: user._id }, { reviewedBy: user._id }],
      }),
    ]);

    if (products || orders || transactions || requests) {
      return res.status(409).json({
        message: "This user is referenced by inventory records and cannot be deleted.",
      });
    }

    await Warehouse.updateMany({ manager: user._id }, { $unset: { manager: 1 } });
    await userModel.findByIdAndDelete(user._id);
    cleanupImageKitAsset(user.imageFileId);
    await logActivity(req, "delete", "user", user._id, { role: user.role });
    return res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("Delete user error:", error);
    return res.status(500).json({ message: "Unable to delete user." });
  }
}

export async function updateOwnProfile(req, res) {
  try {
    const body = req.body || {};
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const oldFileId = user.imageFileId;

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      user.name = body.name.trim();
    }
    if (body.phone !== undefined) {
      user.phone =
        typeof body.phone === "string" ? body.phone.trim() : "";
    }
    if (body.imageUrl !== undefined || body.imageFileId !== undefined) {
      const image = await verifyImageKitAsset(body.imageFileId);
      user.image = image.imageUrl;
      user.imageFileId = image.imageFileId;
    }

    await user.save();
    cleanupReplacedImageKitAsset(oldFileId, user.imageFileId);
    await logActivity(req, "update", "user", user._id, { profile: true });
    return res.status(200).json({
      message: "Profile updated successfully.",
      user: await userModel.findById(user._id).select("-password -googleId"),
    });
  } catch (error) {
    console.error("Update own profile error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to update profile.",
    });
  }
}
