import mongoose from "mongoose";
import productModel from "../models/product.model.js";
import stockModel from "../models/stock.model.js";
import stockTransactionModel from "../models/stockTransaction.model.js";
import userModel from "../models/user.model.js";
import orderModel from "../models/order.model.js";
import supplyRequestModel from "../models/supplyRequest.model.js";
import { verifyImageKitAsset } from "../../services/storage.service.js";
import { assignedWarehouseIds, hasWarehouseAccess } from "../utils/warehouseAccess.js";
import {
  isNonNegativeInteger,
  isNonNegativeNumber,
} from "../utils/validation.js";

async function validateSupplier(supplierId) {
  if (!supplierId) return { supplier: null };
  if (!mongoose.isValidObjectId(supplierId)) {
    return { error: "Invalid supplier ID.", status: 400 };
  }

  const supplier = await userModel.findOne({
    _id: supplierId,
    role: "supplier",
  });
  return supplier
    ? { supplier: supplier._id }
    : { error: "Supplier not found.", status: 404 };
}

export async function listProducts(req, res) {
  try {
    const filter = { sku: { $exists: true } };
    if (req.user.role === "supplier") filter.supplier = req.user.id;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.supplier && req.user.role === "admin") {
      if (!mongoose.isValidObjectId(req.query.supplier)) {
        return res.status(400).json({ message: "Invalid supplier ID." });
      }
      filter.supplier = req.query.supplier;
    }
    if (req.query.q) {
      const search = String(req.query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    let warehouseFilter;
    if (req.query.warehouse) {
      if (!mongoose.isValidObjectId(req.query.warehouse)) {
        return res.status(400).json({ message: "Invalid warehouse ID." });
      }
      if (
        req.user.role === "warehouseManager" &&
        !hasWarehouseAccess(req.user, req.query.warehouse)
      ) {
        return res.status(403).json({ message: "You are not assigned to this warehouse." });
      }
      warehouseFilter = req.query.warehouse;
    } else if (req.user.role === "warehouseManager") {
      warehouseFilter = { $in: assignedWarehouseIds(req.user) };
    }

    const products = await productModel
      .find(filter)
      .populate("supplier", "name email")
      .sort({ createdAt: -1 })
      .lean();
    const stockFilter = { product: { $in: products.map((product) => product._id) } };
    if (warehouseFilter) stockFilter.warehouse = warehouseFilter;
    const stocks = products.length && req.user.role !== "supplier"
      ? await stockModel
          .find(stockFilter)
          .populate("warehouse", "name location")
          .lean()
      : [];
    const stockByProduct = new Map();
    for (const stock of stocks) {
      const key = stock.product.toString();
      const entry = stockByProduct.get(key) || { quantity: 0, inventory: [] };
      entry.quantity += stock.quantity;
      entry.inventory.push({
        warehouse: stock.warehouse,
        quantity: stock.quantity,
      });
      stockByProduct.set(key, entry);
    }

    let result = products.map((product) => {
      if (req.user.role === "supplier") return product;
      return {
        ...product,
        quantity: stockByProduct.get(product._id.toString())?.quantity || 0,
        inventory: stockByProduct.get(product._id.toString())?.inventory || [],
      };
    });
    if (req.query.available === "true") {
      result = result.filter((product) => product.quantity > 0);
    }

    return res.status(200).json({ count: result.length, products: result });
  } catch (error) {
    console.error("List products error:", error);
    return res.status(500).json({ message: "Unable to fetch products." });
  }
}

export async function getProduct(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }
    const product = await productModel
      .findOne({ _id: req.params.id, sku: { $exists: true } })
      .populate("supplier", "name email");
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    if (
      req.user.role === "supplier" &&
      product.supplier?._id.toString() !== req.user.id
    ) {
      return res.status(404).json({ message: "Product not found." });
    }

    const stocks = await stockModel
      .find({ product: product._id })
      .populate("warehouse", "name location");
    const visibleStocks =
      req.user.role === "warehouseManager"
        ? stocks.filter((stock) =>
            hasWarehouseAccess(req.user, stock.warehouse._id),
          )
        : req.user.role === "supplier"
          ? []
          : stocks;

    const productResponse = product.toObject();
    if (req.user.role !== "supplier") {
      productResponse.quantity = visibleStocks.reduce(
        (sum, stock) => sum + stock.quantity,
        0,
      );
      productResponse.inventory = visibleStocks;
    }
    return res.status(200).json({ product: productResponse });
  } catch (error) {
    console.error("Get product error:", error);
    return res.status(500).json({ message: "Unable to fetch product." });
  }
}

export async function createProduct(req, res) {
  try {
    const body = req.body || {};
    const {
      name,
      description = "",
      sku,
      category,
      price,
      lowStockLimit,
      supplier: supplierId,
      imageFileId,
    } = body;

    if (
      ![name, sku, category].every(
        (value) => typeof value === "string" && value.trim(),
      ) ||
      !isNonNegativeNumber(price) ||
      !isNonNegativeInteger(lowStockLimit)
    ) {
      return res.status(400).json({
        message: "Name, SKU, category, a non-negative price, and a non-negative integer low-stock limit are required.",
      });
    }

    const supplierResult = await validateSupplier(supplierId);
    if (supplierResult.error) {
      return res.status(supplierResult.status).json({ message: supplierResult.error });
    }

    const image = await verifyImageKitAsset(imageFileId);
    const product = await productModel.create({
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      sku: sku.trim(),
      category: category.trim(),
      price: Number(price),
      lowStockLimit: Number(lowStockLimit),
      supplier: supplierResult.supplier,
      createdBy: req.user.id,
      ...image,
    });

    return res.status(201).json({
      message: "Product created successfully.",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A product with this SKU already exists." });
    }
    console.error("Create product error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to create product.",
    });
  }
}

export async function updateProduct(req, res) {
  try {
    const body = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }
    const product = await productModel.findOne({
      _id: req.params.id,
      sku: { $exists: true },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const { name, description, sku, category, price, lowStockLimit, supplier } =
      body;
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty." });
      }
      product.name = name.trim();
    }
    if (description !== undefined) {
      product.description =
        typeof description === "string" ? description.trim() : "";
    }
    if (sku !== undefined) {
      if (typeof sku !== "string" || !sku.trim()) {
        return res.status(400).json({ message: "SKU cannot be empty." });
      }
      product.sku = sku.trim();
    }
    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) {
        return res.status(400).json({ message: "Category cannot be empty." });
      }
      product.category = category.trim();
    }
    if (price !== undefined) {
      if (!isNonNegativeNumber(price)) {
        return res.status(400).json({ message: "Price must be non-negative." });
      }
      product.price = Number(price);
    }
    if (lowStockLimit !== undefined) {
      if (!isNonNegativeInteger(lowStockLimit)) {
        return res.status(400).json({
          message: "Low-stock limit must be a non-negative integer.",
        });
      }
      product.lowStockLimit = Number(lowStockLimit);
    }
    if (supplier !== undefined) {
      const supplierResult = await validateSupplier(supplier);
      if (supplierResult.error) {
        return res.status(supplierResult.status).json({ message: supplierResult.error });
      }
      product.supplier = supplierResult.supplier;
    }
    if (body.imageUrl !== undefined || body.imageFileId !== undefined) {
      const image = await verifyImageKitAsset(body.imageFileId);
      product.imageUrl = image.imageUrl;
      product.imageFileId = image.imageFileId;
    }

    await product.save();
    return res.status(200).json({
      message: "Product updated successfully.",
      product,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A product with this SKU already exists." });
    }
    console.error("Update product error:", error);
    return res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : "Unable to update product.",
    });
  }
}

export async function deleteProduct(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }
    const product = await productModel.findOne({
      _id: req.params.id,
      sku: { $exists: true },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const [stock, order, supplyRequest, transaction] = await Promise.all([
      stockModel.exists({ product: product._id }),
      orderModel.exists({ "products.product": product._id }),
      supplyRequestModel.exists({ product: product._id }),
      stockTransactionModel.exists({ product: product._id }),
    ]);
    if (stock || order || supplyRequest || transaction) {
      return res.status(409).json({
        message: "Products referenced by stock, orders, or supply requests cannot be deleted.",
      });
    }

    await productModel.findByIdAndDelete(product._id);
    return res.status(200).json({ message: "Product deleted successfully." });
  } catch (error) {
    console.error("Delete product error:", error);
    return res.status(500).json({ message: "Unable to delete product." });
  }
}
