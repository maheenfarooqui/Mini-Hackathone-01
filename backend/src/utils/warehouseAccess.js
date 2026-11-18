import mongoose from "mongoose";
import Warehouse from "../models/warehouse.model.js";

export function assignedWarehouseIds(user) {
  return (user.assignedWarehouses || []).map((id) => id.toString());
}

export function hasWarehouseAccess(user, warehouseId) {
  return (
    user.role === "admin" ||
    (user.role === "warehouseManager" &&
      assignedWarehouseIds(user).includes(warehouseId.toString()))
  );
}

export async function getWarehouseForUser(user, warehouseId) {
  if (!mongoose.isValidObjectId(warehouseId)) {
    return { error: "Invalid warehouse ID.", status: 400 };
  }

  const warehouse = await Warehouse.findById(warehouseId);

  if (!warehouse) {
    return { error: "Warehouse not found.", status: 404 };
  }

  if (!hasWarehouseAccess(user, warehouseId)) {
    return { error: "You are not assigned to this warehouse.", status: 403 };
  }

  return { warehouse };
}
