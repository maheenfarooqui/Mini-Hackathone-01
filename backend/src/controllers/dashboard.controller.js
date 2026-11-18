import mongoose from "mongoose";
import userModel from "../models/user.model.js";
import productModel from "../models/product.model.js";
import warehouseModel from "../models/warehouse.model.js";
import stockModel from "../models/stock.model.js";
import stockTransactionModel from "../models/stockTransaction.model.js";
import orderModel from "../models/order.model.js";
import supplyRequestModel from "../models/supplyRequest.model.js";
import { assignedWarehouseIds } from "../utils/warehouseAccess.js";

export async function getDashboard(req, res) {
  try {
    const isAdmin = req.user.role === "admin";
    const isManager = req.user.role === "warehouseManager";
    const isSupplier = req.user.role === "supplier";
    const productFilter = {
      sku: { $exists: true },
      ...(isSupplier ? { supplier: req.user.id } : {}),
    };
    const allProducts = await productModel
      .find(productFilter)
      .select("name sku lowStockLimit");
    const stockFilter = isManager
      ? { warehouse: { $in: assignedWarehouseIds(req.user) } }
      : {};
    if (isSupplier) {
      stockFilter.product = { $in: allProducts.map((product) => product._id) };
    }
    const orderFilter =
      req.user.role === "salesRepresentative"
        ? { orderNumber: { $exists: true }, createdBy: req.user.id }
        : isManager
          ? {
              orderNumber: { $exists: true },
              warehouse: { $in: assignedWarehouseIds(req.user) },
            }
          : { orderNumber: { $exists: true } };

    const [
      users,
      warehouses,
      suppliers,
      orders,
      transactions,
      stocks,
      supplyRequests,
    ] = await Promise.all([
      isAdmin ? userModel.countDocuments() : Promise.resolve(undefined),
      isManager
        ? warehouseModel.countDocuments({
            _id: { $in: assignedWarehouseIds(req.user) },
          })
        : warehouseModel.countDocuments(),
      isAdmin
        ? userModel.countDocuments({ role: "supplier" })
        : Promise.resolve(undefined),
      isSupplier
        ? Promise.resolve(undefined)
        : orderModel.countDocuments(orderFilter),
      isAdmin || isManager
        ? stockTransactionModel.countDocuments(stockFilter)
        : Promise.resolve(undefined),
      stockModel
        .find(stockFilter)
        .populate("product", "name sku lowStockLimit")
        .populate("warehouse", "name"),
      isAdmin || isSupplier
        ? supplyRequestModel.countDocuments(
            isAdmin ? {} : { supplier: req.user.id },
          )
        : Promise.resolve(undefined),
    ]);

    const totals = new Map();
    for (const product of allProducts) {
      totals.set(product._id.toString(), {
        product,
        quantity: 0,
        inventory: [],
      });
    }
    for (const stock of stocks) {
      if (!stock.product) continue;
      const productId = stock.product._id.toString();
      const current = totals.get(productId) || {
        product: stock.product,
        quantity: 0,
        inventory: [],
      };
      current.quantity += stock.quantity;
      current.inventory.push({
        warehouse: stock.warehouse,
        quantity: stock.quantity,
      });
      totals.set(productId, current);
    }
    const lowStockProducts = [...totals.values()].filter(
      (item) => item.quantity <= item.product.lowStockLimit,
    );

    return res.status(200).json({
      statistics: {
        ...(users === undefined ? {} : { users }),
        products: allProducts.length,
        warehouses,
        ...(suppliers === undefined ? {} : { suppliers }),
        orders,
        ...(transactions === undefined ? {} : { transactions }),
        ...(supplyRequests === undefined ? {} : { supplyRequests }),
        lowStockProducts: lowStockProducts.length,
      },
      lowStockProducts,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    return res.status(500).json({ message: "Unable to fetch dashboard statistics." });
  }
}
