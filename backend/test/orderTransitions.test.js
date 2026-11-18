import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionOrder } from "../src/utils/orderTransitions.js";

test("sales orders can be processed only from Pending", () => {
  assert.equal(canTransitionOrder("Pending", "Processing"), true);
  assert.equal(canTransitionOrder("Processing", "Processing"), false);
  assert.equal(canTransitionOrder("Completed", "Processing"), false);
  assert.equal(canTransitionOrder("Cancelled", "Processing"), false);
});

test("only processed orders can complete and only pending orders can cancel", () => {
  assert.equal(canTransitionOrder("Processing", "Completed"), true);
  assert.equal(canTransitionOrder("Pending", "Completed"), false);
  assert.equal(canTransitionOrder("Pending", "Cancelled"), true);
  assert.equal(canTransitionOrder("Processing", "Cancelled"), false);
  assert.equal(canTransitionOrder("Cancelled", "Processing"), false);
});
