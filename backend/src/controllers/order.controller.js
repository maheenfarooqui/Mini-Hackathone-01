import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import orderModel from "../models/order.model.js";
import productModel from "../models/product.model.js";
import stockModel from "../models/stock.model.js";
import warehouseModel from "../models/warehouse.model.js";
import {
  assignedWarehouseIds,
  getWarehouseForUser,
} from "../utils/warehouseAccess.js";
import { canTransitionOrder } from "../utils/orderTransitions.js";
import { getAliasedField } from "../utils/requestFields.js";
import { applyStockChange } from "../utils/stockService.js";
import { isPositiveInteger } from "../utils/validation.js";
import { logActivity } from "../utils/logActivity.js";
import PDFDocument from "pdfkit";
import { notifyLowStockAdmins } from "../utils/lowStockMailer.js";

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
    const body = req.body || {};
    const { customerName, customerPhone, products } = body;
    const warehouseId = getAliasedField(body, "warehouseId", "warehouse");
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
      const productId = getAliasedField(item, "productId", "product");
      if (
        !item ||
        typeof item !== "object" ||
        !mongoose.isValidObjectId(productId) ||
        !isPositiveInteger(item.quantity)
      ) {
        return res.status(400).json({
          message: "Each order item needs a valid productId and positive integer quantity.",
        });
      }
      const key = productId.toString();
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
    await logActivity(req, "create", "order", order._id, {
      orderNumber: order.orderNumber,
      totalAmount,
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

export async function getOrderInvoice(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid order ID." });
    }
    const order = await orderModel
      .findOne({ _id: req.params.id, ...orderVisibilityFilter(req.user) })
      .populate("products.product", "name sku")
      .populate("warehouse", "name location");
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }
    if (order.status !== "Completed") {
      return res.status(409).json({ message: "An invoice is available only for completed orders." });
    }

    const filename = `${String(order.orderNumber).replace(/[^a-zA-Z0-9_-]/g, "_")}-invoice.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const document = new PDFDocument({ margin: 48 });
    document.pipe(res);
    document.fontSize(20).text("Manage Your Goods", { continued: false });
    document.moveDown(0.5).fontSize(16).text("Sales Invoice");
    document.moveDown(0.8).fontSize(10);
    document.text(`Order number: ${order.orderNumber}`);
    document.text(`Date: ${new Date(order.createdAt).toLocaleDateString("en-GB")}`);
    document.text(`Customer: ${order.customerName}`);
    document.text(`Phone: ${order.customerPhone}`);
    document.text(`Warehouse: ${order.warehouse?.name || "N/A"}`);
    document.moveDown();

    const x = document.page.margins.left;
    const columns = { item: x, quantity: x + 250, price: x + 310, total: x + 410 };
    const drawRow = (item, quantity, price, total, bold = false) => {
      if (bold) document.font("Helvetica-Bold");
      const rowY = document.y;
      document.text(item, columns.item, rowY, { width: 240 });
      document.text(quantity, columns.quantity, rowY, { width: 50, align: "right" });
      document.text(price, columns.price, rowY, { width: 80, align: "right" });
      document.text(total, columns.total, rowY, { width: 90, align: "right" });
      document.moveDown(0.6);
      if (bold) document.font("Helvetica");
    };

    drawRow("Item", "Qty", "Unit price", "Line total", true);
    document.moveTo(x, document.y).lineTo(document.page.width - document.page.margins.right, document.y).stroke();
    document.moveDown(0.4);
    for (const item of order.products) {
      const lineTotal = item.quantity * item.price;
      drawRow(
        item.product?.name || "Product",
        String(item.quantity),
        `Rs. ${item.price.toFixed(2)}`,
        `Rs. ${lineTotal.toFixed(2)}`,
      );
    }
    document.moveDown(0.5);
    document.font("Helvetica-Bold").fontSize(12).text(
      `Grand total: Rs. ${Number(order.totalAmount).toFixed(2)}`,
      { align: "right" },
    );
    document.end();
    return undefined;
  } catch (error) {
    console.error("Create order invoice error:", error);
    return res.status(500).json({ message: "Unable to generate order invoice." });
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

        for (const item of order.products) {
          await applyStockChange({
            productId: item.product,
            warehouseId: order.warehouse,
            quantity: item.quantity,
            type: "stock-out",
            note: `Sales order ${order.orderNumber}`,
            userId: req.user.id,
            session,
            orderId: order._id,
          });
        }
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

    if (status === "Processing") {
      const productIds = [...new Set(updatedOrder.products.map((item) => item.product.toString()))];
      await Promise.all(productIds.map((productId) => notifyLowStockAdmins(productId)));
    }
    await logActivity(
      req,
      status === "Processing" ? "order.process" : "order.complete",
      "order",
      updatedOrder._id,
      { orderNumber: updatedOrder.orderNumber, status },
    );
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
    await logActivity(req, "order.cancel", "order", updated._id, {
      orderNumber: updated.orderNumber,
    });
    return res.status(200).json({
      message: "Order cancelled successfully.",
      order: updated,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({ message: "Unable to cancel order." });
  }
}
