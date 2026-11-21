import test from "node:test";
import assert from "node:assert/strict";
import { PassThrough } from "node:stream";
import orderModel from "../src/models/order.model.js";
import orderRoute from "../src/routes/order.route.js";
import { getOrderInvoice } from "../src/controllers/order.controller.js";

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

function stubOrderQuery(order, onFilter) {
  return {
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve().then(() => {
        onFilter();
        return order;
      }).then(resolve, reject);
    },
  };
}

test("invoice route is authenticated and limited to roles that can view orders", () => {
  const route = orderRoute.stack.find((layer) => layer.route?.path === "/:id/invoice")?.route;
  assert.ok(route);
  assert.equal(route.methods.get, true);
  assert.equal(orderRoute.stack.some((layer) => !layer.route && layer.handle.name === "verifyToken"), true);
});

test("invoice rejects orders that are not visible or not completed", async (t) => {
  const originalFindOne = orderModel.findOne;
  t.after(() => { orderModel.findOne = originalFindOne; });
  let filter;
  orderModel.findOne = (query) => {
    filter = query;
    return stubOrderQuery({ status: "Pending" }, () => {});
  };

  const response = responseRecorder();
  await getOrderInvoice(
    { params: { id: "507f1f77bcf86cd799439011" }, user: { id: "sales-user", role: "salesRepresentative" } },
    response,
  );
  assert.equal(filter.createdBy, "sales-user");
  assert.equal(filter.orderNumber.$exists, true);
  assert.equal(response.result.status, 409);
  assert.equal(response.result.body.message, "An invoice is available only for completed orders.");

  orderModel.findOne = () => stubOrderQuery(null, () => {});
  const hiddenOrderResponse = responseRecorder();
  await getOrderInvoice(
    { params: { id: "507f1f77bcf86cd799439011" }, user: { id: "sales-user", role: "salesRepresentative" } },
    hiddenOrderResponse,
  );
  assert.equal(hiddenOrderResponse.result.status, 404);
});

test("completed visible orders return a PDF attachment", async (t) => {
  const originalFindOne = orderModel.findOne;
  t.after(() => { orderModel.findOne = originalFindOne; });
  const order = {
    orderNumber: "ORD-123",
    createdAt: new Date("2026-01-02T00:00:00.000Z"),
    customerName: "Customer",
    customerPhone: "123",
    warehouse: { name: "Main warehouse" },
    products: [{ product: { name: "Laptop" }, quantity: 2, price: 80000 }],
    totalAmount: 160000,
    status: "Completed",
  };
  orderModel.findOne = () => stubOrderQuery(order, () => {});

  const response = new PassThrough();
  const headers = {};
  response.setHeader = (key, value) => { headers[key] = value; };
  const chunks = [];
  response.on("data", (chunk) => chunks.push(chunk));
  const completed = new Promise((resolve, reject) => {
    response.on("end", resolve);
    response.on("error", reject);
  });
  await getOrderInvoice(
    { params: { id: "507f1f77bcf86cd799439011" }, user: { id: "sales-user", role: "salesRepresentative" } },
    response,
  );
  await completed;

  assert.equal(headers["Content-Type"], "application/pdf");
  assert.equal(headers["Content-Disposition"], 'attachment; filename="ORD-123-invoice.pdf"');
  assert.equal(Buffer.concat(chunks).subarray(0, 5).toString(), "%PDF-");
});
