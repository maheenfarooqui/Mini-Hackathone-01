import mongoose from "mongoose";
import productModel from "../models/product.model.js";
import warehouseModel from "../models/warehouse.model.js";
import stockModel from "../models/stock.model.js";
import stockTransactionModel from "../models/stockTransaction.model.js";
import {
  assignedWarehouseIds,
  getWarehouseForUser,
} from "../utils/warehouseAccess.js";
import { getAliasedField } from "../utils/requestFields.js";
import { applyStockChange } from "../utils/stockService.js";
import { isPositiveInteger } from "../utils/validation.js";
import { logActivity } from "../utils/logActivity.js";
import {
  notifyLowStockAdmins,
  resetLowStockNotificationIfRecovered,
} from "../utils/lowStockMailer.js";

function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export async function changeStock(req, res, transactionType) {
  const body = req.body || {};
  const productId = getAliasedField(body, "productId", "product");
  const warehouseId = getAliasedField(body, "warehouseId", "warehouse");
  const { quantity, note = "" } = body;

  if (!["stock-in", "stock-out"].includes(transactionType)) {
    return res.status(400).json({ message: "Invalid stock movement type." });
  }
  if (
    !mongoose.isValidObjectId(productId) ||
    !mongoose.isValidObjectId(warehouseId)
  ) {
    return res.status(400).json({ message: "Valid productId and warehouseId are required." });
  }
  if (!isPositiveInteger(quantity)) {
    return res.status(400).json({ message: "Quantity must be a positive integer." });
  }

  let session;
  try {
    const warehouseResult = await getWarehouseForUser(req.user, warehouseId);
    if (warehouseResult.error) {
      return res.status(warehouseResult.status).json({ message: warehouseResult.error });
    }

    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    session = await mongoose.startSession();
    let updatedStock;
    await session.withTransaction(async () => {
      updatedStock = await applyStockChange({
        productId,
        warehouseId,
        quantity,
        type: transactionType,
        note,
        userId: req.user.id,
        session,
      });
    });
    if (transactionType === "stock-out") {
      await notifyLowStockAdmins(productId);
    } else {
      await resetLowStockNotificationIfRecovered(productId);
    }
    await logActivity(req, transactionType, "stock", updatedStock._id, {
      productId,
      warehouseId,
      quantity: Number(quantity),
    });

    return res.status(200).json({
      message: transactionType === "stock-in"
        ? "Stock added successfully."
        : "Stock removed successfully.",
      stock: updatedStock,
    });
  } catch (error) {
    if (error.message === "CAPACITY_EXCEEDED") {
      return res.status(400).json({ message: "Warehouse capacity exceeded." });
    }
    if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({ message: "Not enough stock is available." });
    }
    console.error("Change stock error:", error);
    return res.status(500).json({ message: "Unable to record the stock movement." });
  } finally {
    if (session) await session.endSession();
  }
}

export async function transferStock(req, res) {
  const body = req.body || {};
  const {
    productId,
    fromWarehouseId,
    toWarehouseId,
    quantity,
    note = "",
  } = body;
  if (
    !mongoose.isValidObjectId(productId) ||
    !mongoose.isValidObjectId(fromWarehouseId) ||
    !mongoose.isValidObjectId(toWarehouseId)
  ) {
    return res.status(400).json({
      message: "Valid productId, fromWarehouseId, and toWarehouseId are required.",
    });
  }
  if (fromWarehouseId.toString() === toWarehouseId.toString()) {
    return res.status(400).json({ message: "Source and destination warehouses must differ." });
  }
  if (!isPositiveInteger(quantity)) {
    return res.status(400).json({ message: "Quantity must be a positive integer." });
  }

  let session;
  try {
    const [product, sourceResult, destinationResult] = await Promise.all([
      productModel.findById(productId),
      getWarehouseForUser(req.user, fromWarehouseId),
      getWarehouseForUser(req.user, toWarehouseId),
    ]);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (sourceResult.error) {
      return res.status(sourceResult.status).json({ message: sourceResult.error });
    }
    if (destinationResult.error) {
      return res.status(destinationResult.status).json({ message: destinationResult.error });
    }

    session = await mongoose.startSession();
    let sourceStock;
    let destinationStock;
    await session.withTransaction(async () => {
      sourceStock = await applyStockChange({
        productId,
        warehouseId: fromWarehouseId,
        quantity,
        type: "stock-out",
        note: `Transfer to ${destinationResult.warehouse.name}`,
        userId: req.user.id,
        session,
      });
      destinationStock = await applyStockChange({
        productId,
        warehouseId: toWarehouseId,
        quantity,
        type: "stock-in",
        note: `Transfer from ${sourceResult.warehouse.name}`,
        userId: req.user.id,
        session,
      });
    });

    await Promise.all([
      logActivity(req, "stock-out", "stock", sourceStock._id, {
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity: Number(quantity),
        transfer: true,
        note,
      }),
      logActivity(req, "stock-in", "stock", destinationStock._id, {
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity: Number(quantity),
        transfer: true,
        note,
      }),
    ]);
    return res.status(200).json({
      message: "Stock transferred successfully.",
      fromStock: sourceStock,
      toStock: destinationStock,
    });
  } catch (error) {
    if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(400).json({ message: "Not enough stock is available at the source warehouse." });
    }
    if (error.message === "CAPACITY_EXCEEDED") {
      return res.status(400).json({ message: "Destination warehouse capacity exceeded." });
    }
    console.error("Transfer stock error:", error);
    return res.status(500).json({ message: "Unable to transfer stock." });
  } finally {
    if (session) await session.endSession();
  }
}

export async function listStock(req, res) {
  try {
    const filter = {};
    if (req.query.product) {
      if (!mongoose.isValidObjectId(req.query.product)) {
        return res.status(400).json({ message: "Invalid product ID." });
      }
      filter.product = req.query.product;
    }

    if (req.query.warehouse) {
      if (!mongoose.isValidObjectId(req.query.warehouse)) {
        return res.status(400).json({ message: "Invalid warehouse ID." });
      }
      if (req.user.role === "warehouseManager") {
        const result = await getWarehouseForUser(req.user, req.query.warehouse);
        if (result.error) {
          return res.status(result.status).json({ message: result.error });
        }
      } else if (!(await warehouseModel.exists({ _id: req.query.warehouse }))) {
        return res.status(404).json({ message: "Warehouse not found." });
      }
      filter.warehouse = req.query.warehouse;
    } else if (req.user.role === "warehouseManager") {
      filter.warehouse = { $in: assignedWarehouseIds(req.user) };
    }

    const { page, limit, skip } = pagination(req.query);
    const [stocks, total] = await Promise.all([
      stockModel
        .find(filter)
        .populate("product", "name sku category price lowStockLimit imageUrl")
        .populate("warehouse", "name location")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      stockModel.countDocuments(filter),
    ]);

    return res.status(200).json({
      page,
      limit,
      total,
      stocks,
    });
  } catch (error) {
    console.error("List stock error:", error);
    return res.status(500).json({ message: "Unable to fetch inventory." });
  }
}

export async function listLowStock(req, res) {
  try {
    let warehouseIds;
    if (req.query.warehouse) {
      if (!mongoose.isValidObjectId(req.query.warehouse)) {
        return res.status(400).json({ message: "Invalid warehouse ID." });
      }
      if (req.user.role === "warehouseManager") {
        const result = await getWarehouseForUser(req.user, req.query.warehouse);
        if (result.error) {
          return res.status(result.status).json({ message: result.error });
        }
      } else if (!(await warehouseModel.exists({ _id: req.query.warehouse }))) {
        return res.status(404).json({ message: "Warehouse not found." });
      }
      warehouseIds = [req.query.warehouse];
    } else if (req.user.role === "warehouseManager") {
      warehouseIds = assignedWarehouseIds(req.user);
    }

    const filter = warehouseIds ? { warehouse: { $in: warehouseIds } } : {};
    const [productsInCatalog, stocks] = await Promise.all([
      productModel.find().select("name sku category lowStockLimit imageUrl"),
      stockModel
        .find(filter)
        .populate("product", "name sku category lowStockLimit imageUrl")
        .populate("warehouse", "name location"),
    ]);
    const totals = new Map();
    for (const product of productsInCatalog) {
      totals.set(product._id.toString(), {
        product,
        quantity: 0,
        inventory: [],
      });
    }
    for (const stock of stocks) {
      if (!stock.product) continue;
      const key = stock.product._id.toString();
      const value = totals.get(key) || {
        product: stock.product,
        quantity: 0,
        inventory: [],
      };
      value.quantity += stock.quantity;
      value.inventory.push({
        warehouse: stock.warehouse,
        quantity: stock.quantity,
      });
      totals.set(key, value);
    }

    const products = [...totals.values()].filter(
      (item) => item.quantity <= item.product.lowStockLimit,
    );
    return res.status(200).json({
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("List low stock error:", error);
    return res.status(500).json({ message: "Unable to fetch low-stock products." });
  }
}

export async function listTransactions(req, res) {
  try {
    const filter = {};
    if (req.user.role === "warehouseManager") {
      filter.warehouse = { $in: assignedWarehouseIds(req.user) };
    }
    if (req.query.warehouse) {
      if (!mongoose.isValidObjectId(req.query.warehouse)) {
        return res.status(400).json({ message: "Invalid warehouse ID." });
      }
      if (req.user.role === "warehouseManager") {
        const result = await getWarehouseForUser(req.user, req.query.warehouse);
        if (result.error) {
          return res.status(result.status).json({ message: result.error });
        }
      }
      filter.warehouse = req.query.warehouse;
    }
    if (req.query.product) {
      if (!mongoose.isValidObjectId(req.query.product)) {
        return res.status(400).json({ message: "Invalid product ID." });
      }
      filter.product = req.query.product;
    }
    if (req.query.type) {
      if (!["stock-in", "stock-out"].includes(req.query.type)) {
        return res.status(400).json({ message: "Invalid transaction type." });
      }
      filter.transactionType = req.query.type;
    }

    const { page, limit, skip } = pagination(req.query);
    const [transactions, total] = await Promise.all([
      stockTransactionModel
        .find(filter)
        .populate("product", "name sku")
        .populate("warehouse", "name location")
        .populate("performedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      stockTransactionModel.countDocuments(filter),
    ]);

    return res.status(200).json({ page, limit, total, transactions });
  } catch (error) {
    console.error("List transactions error:", error);
    return res.status(500).json({ message: "Unable to fetch stock transactions." });
  }
}
