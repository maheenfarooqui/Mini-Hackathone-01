import test from "node:test";
import assert from "node:assert/strict";
import stockModel from "../src/models/stock.model.js";
import stockTransactionModel from "../src/models/stockTransaction.model.js";
import supplyRequestRoute from "../src/routes/supplyRequest.route.js";
import warehouseModel from "../src/models/warehouse.model.js";
import {
  applyStockChange,
  assertStockCapacity,
} from "../src/utils/stockService.js";
import { supplyRequestFilterForUser } from "../src/utils/supplyRequestFilter.js";

function routeMiddleware(path, method) {
  const layer = supplyRequestRoute.stack.find(
    (item) => item.route?.path === path && item.route.methods[method],
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} should be registered`);
  return layer.route.stack[0].handle;
}

function runMiddleware(middleware, role) {
  const result = { status: 200, continued: false };
  const response = {
    status(status) {
      result.status = status;
      return this;
    },
    json() {
      return this;
    },
  };
  middleware({ user: { role } }, response, () => {
    result.continued = true;
  });
  return result;
}

test("supply-request lists are scoped to a supplier or assigned manager warehouses", () => {
  assert.deepEqual(supplyRequestFilterForUser({
    id: "supplier-id",
    role: "supplier",
  }), { supplier: "supplier-id" });
  assert.deepEqual(supplyRequestFilterForUser({
    role: "warehouseManager",
    assignedWarehouses: ["warehouse-a", "warehouse-b"],
  }), { warehouse: { $in: ["warehouse-a", "warehouse-b"] } });
  assert.deepEqual(supplyRequestFilterForUser({ role: "admin" }), {});
});

test("warehouse managers can list and review supply requests, suppliers cannot review", () => {
  assert.equal(runMiddleware(routeMiddleware("/", "get"), "warehouseManager").continued, true);
  assert.equal(runMiddleware(routeMiddleware("/:id/review", "patch"), "warehouseManager").continued, true);
  assert.equal(runMiddleware(routeMiddleware("/:id/status", "put"), "warehouseManager").continued, true);
  assert.equal(runMiddleware(routeMiddleware("/:id/review", "patch"), "supplier").status, 403);
});

test("stock changes update inventory and create a linked transaction", async () => {
  const originalUpdate = stockModel.findOneAndUpdate;
  const originalCreate = stockTransactionModel.create;
  const originalWarehouseFind = warehouseModel.findById;
  const calls = {};
  const session = { id: "session" };
  try {
    stockModel.findOneAndUpdate = async (filter, update, options) => {
      calls.filter = filter;
      calls.update = update;
      calls.options = options;
      return { quantity: 12 };
    };
    warehouseModel.findById = () => ({
      session: async () => ({ capacity: 0 }),
    });
    stockTransactionModel.create = async (documents, options) => {
      calls.documents = documents;
      calls.transactionOptions = options;
    };

    const stock = await applyStockChange({
      productId: "product-id",
      warehouseId: "warehouse-id",
      quantity: 5,
      type: "stock-in",
      note: " replenished ",
      userId: "manager-id",
      session,
    });

    assert.equal(stock.quantity, 12);
    assert.equal(calls.filter.product, "product-id");
    assert.deepEqual(calls.update, { $inc: { quantity: 5 } });
    assert.equal(calls.options.session, session);
    assert.equal(calls.documents[0].note, "replenished");
    assert.equal(calls.documents[0].performedBy, "manager-id");
    assert.equal(calls.transactionOptions.session, session);
  } finally {
    stockModel.findOneAndUpdate = originalUpdate;
    stockTransactionModel.create = originalCreate;
    warehouseModel.findById = originalWarehouseFind;
  }
});

test("stock-out refuses insufficient quantity and does not create a transaction", async () => {
  const originalUpdate = stockModel.findOneAndUpdate;
  const originalCreate = stockTransactionModel.create;
  let transactionCreated = false;
  try {
    stockModel.findOneAndUpdate = async () => null;
    stockTransactionModel.create = async () => {
      transactionCreated = true;
    };

    await assert.rejects(
      applyStockChange({
        productId: "product-id",
        warehouseId: "warehouse-id",
        quantity: 3,
        type: "stock-out",
        userId: "manager-id",
        session: {},
      }),
      { message: "INSUFFICIENT_STOCK:product-id" },
    );
    assert.equal(transactionCreated, false);
  } finally {
    stockModel.findOneAndUpdate = originalUpdate;
    stockTransactionModel.create = originalCreate;
  }
});

test("warehouse stock capacity allows exact fit, rejects overflow, and treats zero as unlimited", () => {
  assert.doesNotThrow(() => assertStockCapacity({
    capacity: 100,
    currentQuantity: 90,
    quantity: 10,
  }));
  assert.throws(
    () => assertStockCapacity({ capacity: 100, currentQuantity: 90, quantity: 11 }),
    { message: "CAPACITY_EXCEEDED" },
  );
  assert.doesNotThrow(() => assertStockCapacity({
    capacity: 0,
    currentQuantity: 900,
    quantity: 100,
  }));
});
