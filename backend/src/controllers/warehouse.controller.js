import mongoose from "mongoose";
import warehouseModel from "../models/warehouse.model.js";
import userModel from "../models/user.model.js";
import stockModel from "../models/stock.model.js";
import orderModel from "../models/order.model.js";
import supplyRequestModel from "../models/supplyRequest.model.js";
import stockTransactionModel from "../models/stockTransaction.model.js";
import { assignedWarehouseIds } from "../utils/warehouseAccess.js";
import { isNonNegativeInteger } from "../utils/validation.js";
import { logActivity } from "../utils/logActivity.js";

async function validateManager(managerId) {
  if (!managerId) return { manager: null };
  if (!mongoose.isValidObjectId(managerId)) {
    return { error: "Invalid manager ID.", status: 400 };
  }
  const manager = await userModel.findOne({
    _id: managerId,
    role: "warehouseManager",
  });
  return manager
    ? { manager: manager._id }
    : { error: "Warehouse manager not found.", status: 404 };
}

export async function listWarehouses(req, res) {
  try {
    const filter =
      req.user.role === "warehouseManager"
        ? { _id: { $in: assignedWarehouseIds(req.user) } }
        : {};
    const warehouses = await warehouseModel
      .find(filter)
      .populate("manager", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: warehouses.length, warehouses });
  } catch (error) {
    console.error("List warehouses error:", error);
    return res.status(500).json({ message: "Unable to fetch warehouses." });
  }
}

export async function getWarehouse(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid warehouse ID." });
    }
    const warehouse = await warehouseModel
      .findById(req.params.id)
      .populate("manager", "name email");
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found." });
    }
    if (
      req.user.role === "warehouseManager" &&
      !assignedWarehouseIds(req.user).includes(warehouse._id.toString())
    ) {
      return res.status(403).json({ message: "You are not assigned to this warehouse." });
    }
    return res.status(200).json({ warehouse });
  } catch (error) {
    console.error("Get warehouse error:", error);
    return res.status(500).json({ message: "Unable to fetch warehouse." });
  }
}

export async function createWarehouse(req, res) {
  try {
    const { name, location, capacity = 0, manager: managerId = null } =
      req.body || {};
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof location !== "string" ||
      !location.trim() ||
      !isNonNegativeInteger(capacity)
    ) {
      return res.status(400).json({
        message: "Name, location, and a non-negative integer capacity are required.",
      });
    }
    const managerResult = await validateManager(managerId);
    if (managerResult.error) {
      return res.status(managerResult.status).json({ message: managerResult.error });
    }

    const warehouse = await warehouseModel.create({
      name: name.trim(),
      location: location.trim(),
      capacity: Number(capacity),
      manager: managerResult.manager,
    });
    if (managerResult.manager) {
      await userModel.findByIdAndUpdate(managerResult.manager, {
        $addToSet: { assignedWarehouses: warehouse._id },
      });
    }
    await logActivity(req, "create", "warehouse", warehouse._id, {
      name: warehouse.name,
    });

    return res.status(201).json({
      message: "Warehouse created successfully.",
      warehouse: await warehouse.populate("manager", "name email"),
    });
  } catch (error) {
    console.error("Create warehouse error:", error);
    return res.status(500).json({ message: "Unable to create warehouse." });
  }
}

export async function updateWarehouse(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid warehouse ID." });
    }
    const warehouse = await warehouseModel.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found." });
    }

    const { name, location, capacity, manager: managerId } = req.body || {};
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      warehouse.name = name.trim();
    }
    if (location !== undefined) {
      if (typeof location !== "string" || !location.trim()) {
        return res.status(400).json({ message: "Location cannot be empty." });
      }
      warehouse.location = location.trim();
    }
    if (capacity !== undefined) {
      if (
        !isNonNegativeInteger(capacity)
      ) {
        return res.status(400).json({
          message: "Capacity must be a non-negative integer.",
        });
      }
      warehouse.capacity = Number(capacity);
    }

    let managerResult;
    if (managerId !== undefined) {
      managerResult = await validateManager(managerId);
      if (managerResult.error) {
        return res.status(managerResult.status).json({ message: managerResult.error });
      }
      const previousManager = warehouse.manager?.toString();
      const nextManager = managerResult.manager?.toString();
      if (previousManager && previousManager !== nextManager) {
        await userModel.findByIdAndUpdate(previousManager, {
          $pull: { assignedWarehouses: warehouse._id },
        });
      }
      warehouse.manager = managerResult.manager;
    }

    await warehouse.save();
    if (managerResult?.manager) {
      await userModel.findByIdAndUpdate(managerResult.manager, {
        $addToSet: { assignedWarehouses: warehouse._id },
      });
    }
    await logActivity(req, "update", "warehouse", warehouse._id, {
      name: warehouse.name,
    });

    return res.status(200).json({
      message: "Warehouse updated successfully.",
      warehouse: await warehouse.populate("manager", "name email"),
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    return res.status(500).json({ message: "Unable to update warehouse." });
  }
}

export async function deleteWarehouse(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid warehouse ID." });
    }
    const warehouse = await warehouseModel.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found." });
    }
    const [stocks, orders, requests, transactions] = await Promise.all([
      stockModel.exists({ warehouse: warehouse._id }),
      orderModel.exists({ warehouse: warehouse._id }),
      supplyRequestModel.exists({ warehouse: warehouse._id }),
      stockTransactionModel.exists({ warehouse: warehouse._id }),
    ]);
    if (stocks || orders || requests || transactions) {
      return res.status(409).json({
        message: "Warehouses referenced by inventory, orders, or supply requests cannot be deleted.",
      });
    }

    if (warehouse.manager) {
      await userModel.findByIdAndUpdate(warehouse.manager, {
        $pull: { assignedWarehouses: warehouse._id },
      });
    }
    await warehouseModel.findByIdAndDelete(warehouse._id);
    await logActivity(req, "delete", "warehouse", warehouse._id, {
      name: warehouse.name,
    });
    return res.status(200).json({ message: "Warehouse deleted successfully." });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    return res.status(500).json({ message: "Unable to delete warehouse." });
  }
}
