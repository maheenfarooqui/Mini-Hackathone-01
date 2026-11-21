import test from "node:test";
import assert from "node:assert/strict";
import reportRoute from "../src/routes/report.route.js";
import {
  parseReportDateRange,
  reportWarehouseFilter,
} from "../src/utils/reportFilters.js";

test("warehouse-manager reports are constrained to assigned warehouses", () => {
  assert.deepEqual(reportWarehouseFilter({
    role: "warehouseManager",
    assignedWarehouses: ["warehouse-a"],
  }), { warehouse: { $in: ["warehouse-a"] } });
  assert.deepEqual(reportWarehouseFilter({ role: "admin" }), {});
});

test("report date ranges validate order and include the full end date", () => {
  const range = parseReportDateRange({
    from: "2026-03-01",
    to: "2026-03-02",
  });
  assert.equal(range.from.toISOString(), "2026-03-01T00:00:00.000Z");
  assert.equal(range.to.toISOString(), "2026-03-02T23:59:59.999Z");
  assert.equal(parseReportDateRange({ from: "not-a-date", to: "2026-03-02" }).error !== undefined, true);
  assert.equal(parseReportDateRange({ from: "2026-03-03", to: "2026-03-02" }).error, "The from date must be before the to date.");
});

test("all report endpoints are mounted behind authentication and manager/admin authorization", () => {
  const guards = reportRoute.stack
    .filter((layer) => !layer.route)
    .map((layer) => layer.handle);
  assert.equal(guards.length, 2);
  assert.equal(guards[0].name, "verifyToken");

  const roleResult = { status: 200, continued: false };
  guards[1](
    { user: { role: "supplier" } },
    {
      status(status) {
        roleResult.status = status;
        return this;
      },
      json() {},
    },
    () => { roleResult.continued = true; },
  );
  assert.equal(roleResult.status, 403);
  assert.equal(roleResult.continued, false);

  assert.deepEqual(
    reportRoute.stack.filter((layer) => layer.route).map((layer) => layer.route.path),
    ["/sales-monthly", "/stock-movement", "/top-products"],
  );
});
