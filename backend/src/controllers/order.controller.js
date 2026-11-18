import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import orderModel from "../models/order.model.js";
import productModel from "../models/product.model.js";
import stockModel from "../models/stock.model.js";
import stockTransactionModel from "../models/stockTransaction.model.js";
import warehouseModel from "../models/warehouse.model.js";
import {
  assignedWarehouseIds,
  getWarehouseForUser,
} from "../utils/warehouseAccess.js";
import { canTransitionOrder } from "../utils/orderTransitions.js";
import { isPositiveInteger } from "../utils/validation.js";

function pagination(query) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function orderVisibilityFilter(user) {
  if (user.role === "salesRepresentative") {
    return { orderNumber: { $exists: true }, createdBy: user.id };
  }
  if (user.role === "warehouseManager") {
    return {
      orderNumber: { $exists: true },
      warehouse: { $in: assignedWarehouseIds(user) },
    };
  }
  return { orderNumber: { $exists: true } };
}

export async function createOrder(req, res) {
  try {
    const { customerName, customerPhone, warehouseId, products } = req.body || {};
    if (
      typeof customerName !== "string" ||
      !customerName.trim() ||
      typeof customerPhone !== "string" ||
      !customerPhone.trim() ||
      !mongoose.isValidObjectId(warehouseId) ||
      !Array.isArray(products) ||
      products.length === 0
    ) {
      return res.status(400).json({
        message: "Customer details, warehouseId, and at least one product are required.",
      });
    }

    const warehouse = await warehouseModel.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({ message: "Warehouse not found." });
    }

    const quantities = new Map();
    for (const item of products) {
      if (
        !item ||
        typeof item !== "object" ||
        !mongoose.isValidObjectId(item.productId) ||
        !isPositiveInteger(item.quantity)
      ) {
        return res.status(400).json({
          message: "Each order item needs a valid productId and positive integer quantity.",
        });
      }
      const key = item.productId.toString();
      quantities.set(key, (quantities.get(key) || 0) + Number(item.quantity));
    }

    const orderProducts = [];
    let totalAmount = 0;
    for (const [productId, quantity] of quantities) {
      const [product, availableStock] = await Promise.all([
        productModel.findById(productId),
        stockModel.findOne({ product: productId, warehouse: warehouseId }),
      ]);
      if (!product) {
        return res.status(404).json({ message: "A product in this order was not found." });
      }
      if (!availableStock || availableStock.quantity < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}.`,
          availableStock: availableStock?.quantity || 0,
        });
      }
      orderProducts.push({ product: product._id, quantity, price: product.price });
      totalAmount += product.price * quantity;
      if (!Number.isFinite(totalAmount)) {
        return res.status(400).json({ message: "Order total exceeds the supported amount." });
      }
    }

    const order = await orderModel.create({
      orderNumber: `ORD-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      products: orderProducts,
      totalAmount,
      warehouse: warehouse._id,
      createdBy: req.user.id,
      status: "Pending",
    });

    return res.status(201).json({
      message: "Sales order created successfully.",
      order: await order.populate([
        { path: "products.product", select: "name sku imageUrl" },
        { path: "warehouse", select: "name location" },
      ]),
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({ message: "Unable to create sales order." });
  }
}

export async function listOrders(req, res) {
  try {
    const filter = orderVisibilityFilter(req.user);
    if (req.query.status) {
      if (!["Pending", "Processing", "Completed", "Cancelled"].includes(req.query.status)) {
        return res.status(400).json({ message: "Invalid order status." });
      }
      filter.status = req.query.status;
    }
    const { page, limit, skip } = pagination(req.query);
    const [orders, total] = await Promise.all([
      orderModel
        .find(filter)
        .populate("products.product", "name sku imageUrl")
        .populate("warehouse", "name location")
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      orderModel.countDocuments(filter),
    ]);
    return res.status(200).json({ page, limit, total, orders });
  } catch (error) {
    console.error("List orders error:", error);
    return res.status(500).json({ message: "Unable to fetch orders." });
  }
}

export async function getOrder(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }
    const order = await orderModel
      .findOne({ _id: req.params.id, ...orderVisibilityFilter(req.user) })
      .populate("products.product", "name sku imageUrl")
      .populate("warehouse", "name location")
      .populate("createdBy", "name email");
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    return res.status(200).json({ order });
  } catch (error) {
    console.error("Get order error:", error);
    return res.status(500).json({ message: "Unable to fetch order." });
  }
}

export async function updateOrderStatus(req, res) {
  const { status } = req.body || {};
  if (!["Processing", "Completed"].includes(status)) {
    return res.status(400).json({ message: "Status must be Processing or Completed." });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid order ID." });
  }

  let session;
  try {
    session = await mongoose.startSession();
    let updatedOrder;
    await session.withTransaction(async () => {
      const order = await orderModel
        .findOne({ _id: req.params.id, orderNumber: { $exists: true } })
        .session(session);
      if (!order) throw new Error("ORDER_NOT_FOUND");

      const warehouseResult = await getWarehouseForUser(req.user, order.warehouse);
      if (warehouseResult.error) {
        const error = new Error(warehouseResult.error);
        error.statusCode = warehouseResult.status;
        throw error;
      }

      if (status === "Processing") {
        if (!canTransitionOrder(order.status, status)) {
          throw new Error("INVALID_ORDER_TRANSITION");
        }

        const transactions = [];
        for (const item of order.products) {
          const updatedStock = await stockModel.findOneAndUpdate(
            {
              product: item.product,
              warehouse: order.warehouse,
              quantity: { $gte: item.quantity },
            },
            { $inc: { quantity: -item.quantity } },
            { new: true, session },
          );
          if (!updatedStock) {
            throw new Error(`INSUFFICIENT_STOCK:${item.product}`);
          }
          transactions.push({
            product: item.product,
            warehouse: order.warehouse,
            transactionType: "stock-out",
            quantity: item.quantity,
            note: `Sales order ${order.orderNumber}`,
            performedBy: req.user.id,
            order: order._id,
          });
        }
        await stockTransactionModel.create(transactions, { session });
        order.status = "Processing";
        order.processedAt = new Date();
      } else {
        if (!canTransitionOrder(order.status, status)) {
          throw new Error("INVALID_ORDER_TRANSITION");
        }
        order.status = "Completed";
      }

      await order.save({ session });
      updatedOrder = order;
    });

    return res.status(200).json({
      message: `Order ${status.toLowerCase()} successfully.`,
      order: await updatedOrder.populate([
        { path: "products.product", select: "name sku" },
        { path: "warehouse", select: "name location" },
      ]),
    });
  } catch (error) {
    if (error.message === "ORDER_NOT_FOUND") {
      return res.status(404).json({ message: "Order not found." });
    }
    if (error.message === "INVALID_ORDER_TRANSITION") {
      return res.status(409).json({
        message: "This order cannot transition to the requested status.",
      });
    }
    if (error.message.startsWith("INSUFFICIENT_STOCK:")) {
      return res.status(409).json({
        message: "Insufficient stock is available to process this order.",
      });
    }
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }
    console.error("Update order status error:", error);
    return res.status(500).json({ message: "Unable to update order status." });
  } finally {
    if (session) await session.endSession();
  }
}

export async function cancelOrder(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }
    const filter =
      req.user.role === "salesRepresentative"
        ? {
            _id: req.params.id,
            createdBy: req.user.id,
            orderNumber: { $exists: true },
          }
        : { _id: req.params.id, orderNumber: { $exists: true } };
    const order = await orderModel.findOne(filter);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (req.user.role !== "salesRepresentative") {
      const warehouseResult = await getWarehouseForUser(req.user, order.warehouse);
      if (warehouseResult.error) {
        return res.status(warehouseResult.status).json({ message: warehouseResult.error });
      }
    }
    if (!canTransitionOrder(order.status, "Cancelled")) {
      return res.status(409).json({
        message: "Only orders that have not been processed can be cancelled.",
      });
    }

    const updated = await orderModel.findOneAndUpdate(
      { _id: order._id, status: "Pending" },
      { $set: { status: "Cancelled" } },
      { new: true },
    );
    if (!updated) {
      return res.status(409).json({ message: "Order status changed; reload and try again." });
    }
    return res.status(200).json({
      message: "Order cancelled successfully.",
      order: updated,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({ message: "Unable to cancel order." });
  }
}
