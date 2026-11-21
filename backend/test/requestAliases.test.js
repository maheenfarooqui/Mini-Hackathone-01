import test from "node:test";
import assert from "node:assert/strict";
import { getAliasedField } from "../src/utils/requestFields.js";
import orderRoute from "../src/routes/order.route.js";
import supplyRequestRoute from "../src/routes/supplyRequest.route.js";

function hasRoute(router, path, method) {
  return router.stack.some(
    (layer) => layer.route?.path === path && layer.route.methods[method],
  );
}

test("legacy request fields are accepted without overriding canonical fields", () => {
  assert.equal(getAliasedField({ productId: "new", product: "old" }, "productId", "product"), "new");
  assert.equal(getAliasedField({ product: "old" }, "productId", "product"), "old");
  assert.equal(getAliasedField({ productId: null, product: "old" }, "productId", "product"), "old");
});

test("PDF-spec order and supply-request routes are registered as PUT aliases", () => {
  assert.equal(hasRoute(orderRoute, "/:id/status", "patch"), true);
  assert.equal(hasRoute(orderRoute, "/:id/status", "put"), true);
  assert.equal(hasRoute(orderRoute, "/:id/cancel", "patch"), true);
  assert.equal(hasRoute(orderRoute, "/:id/cancel", "put"), true);
  assert.equal(hasRoute(supplyRequestRoute, "/:id/review", "patch"), true);
  assert.equal(hasRoute(supplyRequestRoute, "/:id/status", "put"), true);
});
