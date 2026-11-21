import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import User from "../src/models/user.model.js";
import Product from "../src/models/product.model.js";
import Stock from "../src/models/stock.model.js";
import SupplyRequest from "../src/models/supplyRequest.model.js";

test("user roles are limited to the four inventory roles", async () => {
  const invalidUser = new User({
    name: "Test User",
    email: "test@example.com",
    password: "hashed-password",
    role: "user",
  });

  const error = await invalidUser.validate().catch((validationError) => validationError);
  assert.equal(error.errors.role.kind, "enum");
});

test("products require whole non-negative stock alert thresholds", async () => {
  const product = new Product({
    name: "Laptop",
    sku: "lap-1",
    category: "Electronics",
    price: 80000,
    lowStockLimit: 1.5,
    imageUrl: "https://images.example/laptop.jpg",
    imageFileId: "image-file-id",
    createdBy: new mongoose.Types.ObjectId(),
  });

  const error = await product.validate().catch((validationError) => validationError);
  assert.ok(error.errors.lowStockLimit);
  assert.equal(product.sku, "LAP-1");
});

test("warehouse stock cannot become negative or fractional", async () => {
  const stock = new Stock({
    product: new mongoose.Types.ObjectId(),
    warehouse: new mongoose.Types.ObjectId(),
    quantity: -1,
  });

  const error = await stock.validate().catch((validationError) => validationError);
  assert.ok(error.errors.quantity);
  assert.equal(Stock.schema.path("lowStockNotifiedAt").instance, "Date");
});

test("supply requests track when approved stock was received", () => {
  const receivedAt = new Date();
  const request = new SupplyRequest({ stockReceivedAt: receivedAt });
  assert.equal(request.stockReceivedAt.getTime(), receivedAt.getTime());
  assert.equal(SupplyRequest.schema.path("stockReceivedAt").instance, "Date");
});
