import test from "node:test";
import assert from "node:assert/strict";
import ActivityLog from "../src/models/activityLog.model.js";
import activityRoute from "../src/routes/activity.route.js";
import { logActivity } from "../src/utils/logActivity.js";

test("activity log model stores actor, action, entity, details, and request IP", () => {
  const log = new ActivityLog({
    user: "507f1f77bcf86cd799439011",
    action: "create",
    entity: "product",
    entityId: "507f1f77bcf86cd799439012",
    details: { sku: "LAP-1" },
    ip: "127.0.0.1",
  });
  assert.equal(log.user.toString(), "507f1f77bcf86cd799439011");
  assert.equal(log.entityId.toString(), "507f1f77bcf86cd799439012");
  assert.equal(log.details.sku, "LAP-1");
  assert.equal(ActivityLog.schema.options.timestamps, true);
});

test("activity logging never throws when persistence fails", async () => {
  const originalCreate = ActivityLog.create;
  const originalError = console.error;
  ActivityLog.create = async () => {
    throw new Error("database unavailable");
  };
  console.error = () => {};
  try {
    await assert.doesNotReject(
      logActivity(
        { user: { id: "507f1f77bcf86cd799439011" }, ip: "127.0.0.1" },
        "create",
        "product",
        "507f1f77bcf86cd799439012",
      ),
    );
  } finally {
    ActivityLog.create = originalCreate;
    console.error = originalError;
  }
});

test("activity log route places administrator authorization before listing", () => {
  const route = activityRoute.stack.find((layer) => layer.route?.path === "/")?.route;
  assert.deepEqual(route.stack.map((layer) => layer.handle.name), [
    "verifyToken",
    "adminOnly",
    "listActivity",
  ]);
});
