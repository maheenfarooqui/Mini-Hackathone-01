import mongoose from "mongoose";
import userModel from "../models/user.model.js";
import productModel from "../models/product.model.js";
import warehouseModel from "../models/warehouse.model.js";
import supplyRequestModel from "../models/supplyRequest.model.js";
import {
  cleanupReplacedImageKitAsset,
  verifyImageKitAsset,
} from "../../services/storage.service.js";
import { getWarehouseForUser } from "../utils/warehouseAccess.js";
import { applyStockChange } from "../utils/stockService.js";
import { getAliasedField } from "../utils/requestFields.js";
import { supplyRequestFilterForUser } from "../utils/supplyRequestFilter.js";
import { isPositiveInteger } from "../utils/validation.js";
import { logActivity } from "../utils/logActivity.js";
import { resetLowStockNotificationIfRecovered } from "../utils/lowStockMailer.js";

export async function listSuppliers(req, res) {
  try {
    const suppliers = await userModel
      .find({ role: "supplier" })
      .select("name email phone image imageFileId createdAt")
      .sort({ name: 1 });
    return res.status(200).json({ count: suppliers.length, suppliers });
  } catch (error) {
    console.error("List suppliers error:", error);
    return res.status(500).json({ message: "Unable to fetch suppliers." });
  }
}

export async function getSupplierProfile(req, res) {
  try {
    const supplier = await userModel
      .findById(req.user.id)
      .select("name email phone image imageFileId role");
    if (!supplier || supplier.role !== "supplier") {
      return res.status(404).json({ message: "Supplier profile not found." });
    }

    return res.status(200).json({
      supplier,
      products: await productModel
        .find({ supplier: supplier._id })
        .select("name sku category price lowStockLimit imageUrl"),
    });
  } catch (error) {
    console.error("Get supplier profile error:", error);
    return res.status(500).json({ message: "Unable to fetch supplier profile." });
  }
}

export async function updateSupplierProfile(req, res) {
  try {
    const body = req.body || {};
    const supplier = await userModel.findOne({
      _id: req.user.id,
      role: "supplier",
    });
    if (!supplier) {
      return res.status(404).json({ message: "Supplier profile not found." });
    }
    const oldFileId = supplier.imageFileId;

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      supplier.name = body.name.trim();
    }
    if (body.phone !== undefined) {
      supplier.phone =
        typeof body.phone === "string" ? body.phone.trim() : "";
    }
    if (body.imageUrl !== undefined || body.imageFileId !== undefined) {
      const image = await verifyImageKitAsset(body.imageFileId);
      supplier.image = image.imageUrl;
      supplier.imageFileId = image.imageFileId;
    }

    await supplier.save();
    cleanupReplacedImageKitAsset(oldFileId, supplier.imageFileId);
    await logActivity(req, "update", "user", supplier._id, { profile: true });
    return res.status(200).json({
      message: "Supplier profile updated successfully.",
      supplier: await userModel
        .findById(supplier._id)
        .select("name email phone image imageFileId role"),
    });
  } catch (error) {
    console.error("Update supplier profile error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to update supplier profile.",
    });
  }
}

export async function listSupplyRequests(req, res) {
  try {
    const filter = supplyRequestFilterForUser(req.user);
    if (req.query.status) {
      if (!["Pending", "Approved", "Rejected"].includes(req.query.status)) {
        return res.status(400).json({ message: "Invalid supply request status." });
      }
      filter.status = req.query.status;
    }

    const requests = await supplyRequestModel
      .find(filter)
      .populate("supplier", "name email")
      .populate("product", "name sku category")
      .populate("warehouse", "name location")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json({ count: requests.length, requests });
  } catch (error) {
    console.error("List supply requests error:", error);
    return res.status(500).json({ message: "Unable to fetch supply requests." });
  }
}

export async function createSupplyRequest(req, res) {
  try {
    const body = req.body || {};
    const productId = getAliasedField(body, "productId", "product");
    const warehouseId = getAliasedField(body, "warehouseId", "warehouse");
    const { quantity } = body;
    if (
      !mongoose.isValidObjectId(productId) ||
      !mongoose.isValidObjectId(warehouseId) ||
      !isPositiveInteger(quantity)
    ) {
      return res.status(400).json({
        message: "Valid productId, warehouseId, and positive integer quantity are required.",
      });
    }

    const [product, warehouse] = await Promise.all([
      productModel.findById(productId),
      warehouseModel.findById(warehouseId),
    ]);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (product.supplier?.toString() !== req.user.id) {
      return res.status(403).json({
        message: "You can only request supply for products associated with your account.",
      });
    }
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found." });
    }

    const request = await supplyRequestModel.create({
      supplier: req.user.id,
      product: product._id,
      warehouse: warehouse._id,
      quantity: Number(quantity),
    });
    await logActivity(req, "create", "supply-request", request._id, {
      productId: request.product,
      warehouseId: request.warehouse,
      quantity: request.quantity,
    });
    return res.status(201).json({
      message: "Supply request submitted successfully.",
      request: await request.populate([
        { path: "product", select: "name sku" },
        { path: "warehouse", select: "name location" },
      ]),
    });
  } catch (error) {
    console.error("Create supply request error:", error);
    return res.status(500).json({ message: "Unable to submit supply request." });
  }
}

export async function reviewSupplyRequest(req, res) {
  let session;
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid supply request ID." });
    }
    const { status, reviewNote = "" } = req.body || {};
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved or Rejected." });
    }

    session = await mongoose.startSession();
    let updatedRequest;
    await session.withTransaction(async () => {
      const pendingRequest = await supplyRequestModel
        .findOne({ _id: req.params.id, status: "Pending" })
        .session(session);
      if (!pendingRequest) {
        const exists = await supplyRequestModel
          .exists({ _id: req.params.id })
          .session(session);
        throw new Error(exists ? "SUPPLY_REQUEST_ALREADY_REVIEWED" : "SUPPLY_REQUEST_NOT_FOUND");
      }

      const warehouseResult = await getWarehouseForUser(
        req.user,
        pendingRequest.warehouse,
      );
      if (warehouseResult.error) {
        const error = new Error(warehouseResult.error);
        error.statusCode = warehouseResult.status;
        throw error;
      }

      const stockReceivedAt = status === "Approved" ? new Date() : null;
      updatedRequest = await supplyRequestModel.findOneAndUpdate(
        { _id: req.params.id, status: "Pending" },
        {
          $set: {
            status,
            reviewedBy: req.user.id,
            reviewNote:
              typeof reviewNote === "string" ? reviewNote.trim() : "",
            stockReceivedAt,
          },
        },
        { new: true, session },
      );
      if (!updatedRequest) throw new Error("SUPPLY_REQUEST_ALREADY_REVIEWED");

      if (status === "Approved") {
        await applyStockChange({
          productId: pendingRequest.product,
          warehouseId: pendingRequest.warehouse,
          quantity: pendingRequest.quantity,
          type: "stock-in",
          note: `Supply request ${pendingRequest._id}`,
          userId: req.user.id,
          session,
        });
      }
    });

    if (status === "Approved") {
      await resetLowStockNotificationIfRecovered(updatedRequest.product);
    }
    await logActivity(req, "supply-request.review", "supply-request", updatedRequest._id, {
      status,
      stockReceivedAt: updatedRequest.stockReceivedAt,
    });
    return res.status(200).json({
      message: `Supply request ${status.toLowerCase()}.`,
      request: await updatedRequest.populate([
        { path: "supplier", select: "name email" },
        { path: "product", select: "name sku" },
        { path: "warehouse", select: "name location" },
        { path: "reviewedBy", select: "name email" },
      ]),
    });
  } catch (error) {
    if (error.message === "CAPACITY_EXCEEDED") {
      return res.status(400).json({ message: "Warehouse capacity exceeded." });
    }
    if (error.message === "SUPPLY_REQUEST_ALREADY_REVIEWED") {
      return res.status(409).json({
        message: "This supply request has already been reviewed.",
      });
    }
    if (error.message === "SUPPLY_REQUEST_NOT_FOUND") {
      return res.status(404).json({ message: "Supply request not found." });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Review supply request error:", error);
    return res.status(500).json({ message: "Unable to review supply request." });
  } finally {
    if (session) await session.endSession();
  }
}
