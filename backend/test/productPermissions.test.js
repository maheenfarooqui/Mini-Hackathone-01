import test from "node:test";
import assert from "node:assert/strict";
import productRoute from "../src/routes/product.route.js";

function routeMiddleware(path, method) {
  const layer = productRoute.stack.find(
    (item) => item.route?.path === path && item.route.methods[method],
  );
  assert.ok(layer, `${method.toUpperCase()} ${path} should be registered`);
  return layer.route.stack[0].handle;
}

function runMiddleware(middleware, role) {
  const result = { status: 200, body: null, continued: false };
  const response = {
    status(status) {
      result.status = status;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  middleware({ user: { role } }, response, () => {
    result.continued = true;
  });
  return result;
}

test("warehouse managers can create and update products, but cannot delete", () => {
  for (const [path, method] of [["/", "post"], ["/:id", "put"]]) {
    const result = runMiddleware(routeMiddleware(path, method), "warehouseManager");
    assert.equal(result.continued, true);
    assert.equal(result.status, 200);
  }

  const deleteResult = runMiddleware(routeMiddleware("/:id", "delete"), "warehouseManager");
  assert.equal(deleteResult.continued, false);
  assert.equal(deleteResult.status, 403);
});

test("suppliers and sales representatives cannot create or update products", () => {
  for (const role of ["supplier", "salesRepresentative"]) {
    for (const [path, method] of [["/", "post"], ["/:id", "put"]]) {
      const result = runMiddleware(routeMiddleware(path, method), role);
      assert.equal(result.continued, false);
      assert.equal(result.status, 403);
    }
  }
});
