import test from "node:test";
import assert from "node:assert/strict";
import stockRoute from "../src/routes/stock.route.js";
import { transferStock } from "../src/controllers/stock.controller.js";

function responseRecorder() {
  const result = { status: 200, body: null };
  return {
    result,
    status(status) {
      result.status = status;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
}

test("stock transfer rejects identical warehouses and invalid quantities before database access", async () => {
  const id = "507f1f77bcf86cd799439011";
  const sameWarehouseResponse = responseRecorder();
  await transferStock({
    body: {
      productId: id,
      fromWarehouseId: id,
      toWarehouseId: id,
      quantity: 1,
    },
  }, sameWarehouseResponse);
  assert.equal(sameWarehouseResponse.result.status, 400);
  assert.equal(
    sameWarehouseResponse.result.body.message,
    "Source and destination warehouses must differ.",
  );

  const invalidQuantityResponse = responseRecorder();
  await transferStock({
    body: {
      productId: id,
      fromWarehouseId: id,
      toWarehouseId: "507f1f77bcf86cd799439012",
      quantity: 0,
    },
  }, invalidQuantityResponse);
  assert.equal(invalidQuantityResponse.result.status, 400);
  assert.equal(invalidQuantityResponse.result.body.message, "Quantity must be a positive integer.");
});

test("only admins and warehouse managers may call the stock transfer endpoint", () => {
  const route = stockRoute.stack.find((layer) => layer.route?.path === "/transfer")?.route;
  assert.ok(route);
  const authorize = route.stack[0].handle;
  for (const role of ["admin", "warehouseManager"]) {
    let continued = false;
    authorize({ user: { role } }, { status() { return this; }, json() {} }, () => {
      continued = true;
    });
    assert.equal(continued, true);
  }
  const denied = responseRecorder();
  authorize({ user: { role: "salesRepresentative" } }, denied, () => {});
  assert.equal(denied.result.status, 403);
});
