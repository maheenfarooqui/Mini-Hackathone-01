import test from "node:test";
import assert from "node:assert/strict";
import {
  isNonNegativeInteger,
  isNonNegativeNumber,
  isPositiveInteger,
} from "../src/utils/validation.js";

test("quantity and capacity validation rejects coercible non-numeric values", () => {
  assert.equal(isPositiveInteger("3"), true);
  assert.equal(isPositiveInteger(" "), false);
  assert.equal(isPositiveInteger([3]), false);
  assert.equal(isPositiveInteger(1.5), false);
  assert.equal(isPositiveInteger(Number.MAX_SAFE_INTEGER + 1), false);
  assert.equal(isNonNegativeInteger("0"), true);
  assert.equal(isNonNegativeInteger(-1), false);
});

test("prices must be finite non-negative numeric values", () => {
  assert.equal(isNonNegativeNumber("12.50"), true);
  assert.equal(isNonNegativeNumber(0), true);
  assert.equal(isNonNegativeNumber(""), false);
  assert.equal(isNonNegativeNumber(Infinity), false);
  assert.equal(isNonNegativeNumber(-0.1), false);
});
