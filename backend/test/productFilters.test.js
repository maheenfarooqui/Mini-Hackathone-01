import test from "node:test";
import assert from "node:assert/strict";
import productRoute from "../src/routes/product.route.js";
import { parseProductListOptions } from "../src/utils/productFilters.js";
import { exactSkuPattern } from "../src/utils/productSku.js";

test("product list options combine escaped search, facets, price, sorting, and pagination", () => {
  const options = parseProductListOptions({
    q: "Laptop.+",
    category: "Electronics",
    supplier: "507f1f77bcf86cd799439011",
    minPrice: "100",
    maxPrice: "900",
    available: "false",
    sort: "-price",
    page: "3",
    limit: "10",
  }, { id: "admin-id", role: "admin" });

  assert.equal(options.filter.category, "Electronics");
  assert.equal(options.filter.supplier, "507f1f77bcf86cd799439011");
  assert.deepEqual(options.filter.price, { $gte: 100, $lte: 900 });
  assert.equal(options.filter.$or[0].name.$regex, "Laptop\\.\\+");
  assert.equal(options.available, "false");
  assert.deepEqual(options.sort, { price: -1 });
  assert.equal(options.page, 3);
  assert.equal(options.limit, 10);
  assert.equal(options.skip, 20);
});

test("product filters validate bounds and keep suppliers limited to their own products", () => {
  assert.equal(
    parseProductListOptions({ minPrice: "20", maxPrice: "10" }, { role: "admin" }).error,
    "Minimum price cannot exceed maximum price.",
  );
  assert.equal(
    parseProductListOptions({ available: "yes" }, { role: "admin" }).error,
    "Availability must be true or false.",
  );
  assert.equal(
    parseProductListOptions(
      { supplier: "507f1f77bcf86cd799439012" },
      { id: "507f1f77bcf86cd799439011", role: "supplier" },
    ).filter.supplier,
    "507f1f77bcf86cd799439011",
  );
});

test("categories route is registered before the product ID route", () => {
  const paths = productRoute.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);
  assert.ok(paths.indexOf("/categories") < paths.indexOf("/:id"));
  assert.ok(paths.indexOf("/sku/:sku") < paths.indexOf("/:id"));
});

test("SKU lookup trims input, escapes special characters, and matches case-insensitively", () => {
  const pattern = exactSkuPattern("  lap.*-1  ");
  assert.equal(pattern.test("LAP.*-1"), true);
  assert.equal(pattern.test("lap.*-1-extra"), false);
  assert.equal(pattern.test("lapZZ-1"), false);
});
