# Copilot Task Brief: Inventory & Warehouse Management System

Repo: `Mini-Hackathone-01` (`/backend` = Express 5 + Mongoose 9, ES modules; `/frontend` = React + Vite).
Backend is already solid (JWT, bcrypt, role middleware, atomic stock updates, ImageKit). This brief lists **what to fix and add**.

## Global rules (read first)
1. Do tasks **in order**. Finish and test one before starting the next.
2. Do **not** break existing routes, response shapes, or the 10 passing tests (`cd backend && npm test`).
3. Keep ES module syntax (`import`/`export`). Keep the existing error style: `res.status(x).json({ message })`.
4. Never commit secrets. Never expose `IMAGEKIT_PRIVATE_KEY` to the frontend.
5. Add a test in `backend/test/` for every new rule (use `node --test`, same style as existing tests).
6. After each task, update `backend/README.md` API table if routes changed.
7. Backend must enforce roles. Frontend hiding is not enough.

---

# PART A: FIXES (required, they affect marks)

## A1. Add PDF-spec endpoint aliases  (HIGH priority)

**Problem:** The hackathon PDF defines exact endpoints. Ours differ, so Postman tests from the instructor return 404.

| PDF spec | Current code | Fix |
|---|---|---|
| `PUT /api/orders/:id/status` | `PATCH` | add `PUT` (keep `PATCH`) |
| `PUT /api/orders/:id/cancel` | `PATCH` | add `PUT` (keep `PATCH`) |
| `PUT /api/supply-requests/:id/status` | `PATCH /:id/review` | add `PUT /:id/status` (keep old) |
| `GET /api/upload/auth` | `/api/imagekit/auth` | mount same router at `/api/upload` too |
| body `product`, `warehouse` | `productId`, `warehouseId` | accept both |

**Files / changes:**
- `backend/src/routes/order.route.js`: duplicate the `patch` routes for `status` and `cancel` as `router.put(...)` with the same `allowRoles` and handlers.
- `backend/src/routes/supplyRequest.route.js`: add `router.put("/:id/status", adminOnly, reviewSupplyRequest);` (A4 will change the roles).
- `backend/src/app.js`: add `app.use("/api/upload", imagekitRoute);` next to the existing `/api/imagekit` line.
- `backend/src/controllers/stock.controller.js` in `changeStock`, replace the destructuring with:
  ```js
  const body = req.body || {};
  const productId = body.productId ?? body.product;
  const warehouseId = body.warehouseId ?? body.warehouse;
  const { quantity, note = "" } = body;
  ```
- `backend/src/controllers/order.controller.js` in `createOrder`: `warehouseId = body.warehouseId ?? body.warehouse`; for each item use `item.productId ?? item.product`.
- `backend/src/controllers/supplier.controller.js` in `createSupplyRequest`: same alias for `productId`/`warehouseId`.

**Acceptance:** `PUT /api/orders/:id/status`, `PUT /api/orders/:id/cancel`, `PUT /api/supply-requests/:id/status`, `GET /api/upload/auth` all work. `POST /api/stock/in` works with both `{product, warehouse, quantity}` and `{productId, warehouseId, quantity}`.

---

## A2. Warehouse Manager must be able to create/update products

**Problem:** PDF says managers upload product images when creating/updating products. Currently `POST/PUT /api/products` are `adminOnly`.

**Fix** in `backend/src/routes/product.route.js`:
```js
router.post("/", allowRoles("admin", "warehouseManager"), createProduct);
router.put("/:id", allowRoles("admin", "warehouseManager"), updateProduct);
router.delete("/:id", adminOnly, deleteProduct); // unchanged
```
Frontend: show the Add/Edit product form (with image upload) to the `warehouseManager` role in `frontend/src/pages/CatalogPages.jsx` and the sidebar in `frontend/src/layout/AppLayout.jsx`. Hide Delete for managers.

**Acceptance:** manager can create and edit a product with image; manager `DELETE /api/products/:id` returns 403; supplier and sales rep get 403 on create/update.

---

## A3. Delete old ImageKit file on replace / delete

**Problem:** PDF requires using the file ID to delete or replace uploads. Currently, replacing an image or deleting a product leaves the old file in ImageKit.

**Fix:**
- In `product.controller.js` `updateProduct`: save `const oldFileId = product.imageFileId;` before assigning the new image. After `await product.save()` succeeds:
  ```js
  if (oldFileId && oldFileId !== product.imageFileId) {
    deleteImageKitAsset(oldFileId).catch((e) => console.error("ImageKit cleanup failed:", e.message));
  }
  ```
- In `deleteProduct`: after `findByIdAndDelete`, call `deleteImageKitAsset(product.imageFileId)` the same way (non-blocking, errors only logged).
- Do the same in `user.controller.js` `updateOwnProfile` and `supplier.controller.js` `updateSupplierProfile` (old `image`/`imageFileId`). Also in `deleteUser`, delete the user's image.
- Import `deleteImageKitAsset` from `backend/services/storage.service.js`. Failure to delete must **never** fail the API response.

**Acceptance:** after replacing a product image, the old file ID no longer exists in ImageKit; API still returns 200 if ImageKit deletion fails.

---

## A4. Supply request workflow: managers can review, approval receives stock

**Problem:**
- Approving a supply request only changes its status. Nothing enters stock.
- Warehouse managers cannot see or review requests for their warehouses (`supplyRequest.route.js` allows only admin and supplier).

**Fix:**
1. Refactor: extract the transaction logic of `changeStock` in `stock.controller.js` into a reusable helper, e.g. `backend/src/utils/stockService.js`:
   ```js
   export async function applyStockChange({ productId, warehouseId, quantity, type, note, userId, session, orderId = null })
   ```
   It does the `findOneAndUpdate` (upsert for stock-in, `$gte` guard for stock-out), creates the `StockTransaction`, and returns the updated stock. `changeStock` and order processing then call it. Behavior must not change.
2. `supplyRequest.route.js`:
   ```js
   router.get("/", allowRoles("admin","warehouseManager","supplier"), listSupplyRequests);
   router.patch("/:id/review", allowRoles("admin","warehouseManager"), reviewSupplyRequest);
   router.put("/:id/status", allowRoles("admin","warehouseManager"), reviewSupplyRequest);
   ```
3. `listSupplyRequests`: if role is `warehouseManager`, filter `warehouse: { $in: assignedWarehouseIds(req.user) }`.
4. `reviewSupplyRequest`:
   - Manager may only review requests whose warehouse is assigned to them (use `getWarehouseForUser`); else 403.
   - Use a MongoDB session/transaction. Atomically move `Pending → Approved|Rejected` (keep the existing `status: "Pending"` filter so double review returns 409).
   - If `Approved`: call `applyStockChange` with `type: "stock-in"`, `note: "Supply request <id>"`, `userId: req.user.id`, **inside the same session**.
   - If `Rejected`: no stock change.
5. Add a field `stockReceivedAt: Date` to `supplyRequest.model.js` (set when approved + stock added). Never add stock twice.

**Frontend:** add a "Supply Requests" page for the manager role (list + Approve/Reject buttons with confirm dialog), reuse `SupplyRequestPages.jsx`.

**Acceptance:** supplier submits 30 units, manager approves, warehouse stock increases by 30 and one stock-in transaction exists. Approving again returns 409 and stock is unchanged. A manager of another warehouse gets 403.

---

## A5. Enforce warehouse capacity on stock-in

**Problem:** `Warehouse.capacity` exists but is never checked.

**Fix:** in the stock-in branch (inside the transaction, inside `applyStockChange`):
```js
const warehouse = await warehouseModel.findById(warehouseId).session(session);
if (warehouse?.capacity > 0) {
  const [{ total = 0 } = {}] = await stockModel.aggregate([
    { $match: { warehouse: warehouse._id } },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]).session(session);
  if (total + Number(quantity) > warehouse.capacity) {
    throw new Error("CAPACITY_EXCEEDED");
  }
}
```
Catch `CAPACITY_EXCEEDED` and return `400 { message: "Warehouse capacity exceeded." }`.

**Acceptance:** capacity 100, current 90, add 20 returns 400; add 10 succeeds. Capacity empty/0 means unlimited.

---

## A6. Project cleanup (code quality + submission rules)

1. **Create `backend/.env.example`** (names only, no real values):
   ```
   PORT=5000
   NODE_ENV=development
   MONGO_URI=
   JWT_SECRET=
   FRONTEND_URL=
   IMAGEKIT_PUBLIC_KEY=
   IMAGEKIT_PRIVATE_KEY=
   IMAGEKIT_URL_ENDPOINT=
   ADMIN_NAME=
   ADMIN_EMAIL=
   ADMIN_PASSWORD=
   ```
   Add `GOOGLE_*` only if Google login is kept.
2. **Delete `backend/uploads/`** (6 stray files are committed) and add `uploads/` to `backend/.gitignore`. Remove `multer`/`upload.middleware.js` if unused.
3. **Remove leftovers from an old project** if nothing imports them (verify with a search first): `controllers/cart.controller.js`, `post.controller.js`, `contact.controller.js`, `routes/cart.route.js`, `post.route.js`, `contact.route.js`, `models/post.model.js`, `contact.model.js`.
4. `backend/package.json`: rename `"name"` to `"inventory-warehouse-api"`. Scripts: `"start": "node server.js"`, `"dev": "nodemon server.js"`. Move `nodemon` to `devDependencies`.
5. **Rate limit login/register:** `npm i express-rate-limit`, then in `auth.route.js` apply `rateLimit({ windowMs: 15*60*1000, max: 20 })` to `/login` and `/register`.
6. **CORS check:** `app.js` hardcodes `https://mini-hackathone-01-8ofd.vercel.app` as an allowed origin. Remove hardcoded URLs and use only `FRONTEND_URL` (comma-separated list allowed) plus localhost in dev. Confirm the frontend `VITE_API_URL` points to the real backend URL.
7. `README.md` (root): add setup steps, roles, **demo credentials for each role (demo-only passwords)**, deployed URLs, and the API table. Do not put real secrets in it.
8. Run `git ls-files | grep -E "\.env$"`; it must return nothing.

---

# PART B: BONUS FEATURES (add after Part A is done and tested)

Implement in this order (easiest to hardest).

## B1. Activity Log
- New model `backend/src/models/activityLog.model.js`: `{ user: ObjectId ref User, action: String, entity: String, entityId: ObjectId, details: Object, ip: String }`, timestamps.
- Helper `backend/src/utils/logActivity.js`: `export async function logActivity(req, action, entity, entityId, details)`. It must never throw (wrap in try/catch).
- Call it on: login, create/update/delete of user, product, warehouse; stock-in/out; order create/process/complete/cancel; supply request create/review.
- Route `GET /api/activity` (admin only), with pagination and filters `user`, `entity`, `action`, `from`, `to`; populate `user` (`name email role`).
- Frontend: admin page "Activity Log" with a table and filters.

## B2. Advanced product filtering
In `listProducts` (product.controller.js) support all of these query params together:
`q`, `category`, `supplier`, `warehouse`, `available=true|false`, `minPrice`, `maxPrice`, `sort` (`price`, `-price`, `name`, `-createdAt`), `page`, `limit` (return `total`). Also add `GET /api/products/categories` returning distinct categories. Escape regex input as already done. Frontend: filter bar (category, supplier, warehouse, availability, price range, sort).

## B3. Barcode / SKU search
- `GET /api/products/sku/:sku` returns the exact (case-insensitive, trimmed) SKU match plus stock. Place this route **before** `/:id`.
- Frontend: SKU search box on the sales representative product page. Pressing Enter looks up the SKU. Optionally support a USB barcode scanner (it types the SKU and presses Enter).

## B4. Charts (Chart.js)
Backend: new `report.controller.js` and `report.route.js` mounted at `/api/reports` (roles: admin; manager limited to assigned warehouses), using MongoDB aggregation:
- `GET /api/reports/sales-monthly?year=2026`: sum of `totalAmount` per month for `Completed` orders.
- `GET /api/reports/stock-movement?from&to`: stock-in vs stock-out quantity per day/week.
- `GET /api/reports/top-products?limit=5`: top products by quantity sold (unwind `products`, group, populate name).

Frontend: `npm i chart.js react-chartjs-2` and add three charts (Line/Bar/Doughnut) to the admin dashboard in `DashboardPage.jsx`, with loading and empty states.

## B5. Stock transfer between warehouses
- `POST /api/stock/transfer` body `{ productId, fromWarehouseId, toWarehouseId, quantity, note }`.
- Roles: admin, or manager assigned to **both** warehouses (or at least the source; decide and document it).
- Rules: from ≠ to; quantity positive integer; one MongoDB transaction using `applyStockChange` twice (stock-out from source, stock-in at destination, including the capacity check); notes `"Transfer to <name>"` / `"Transfer from <name>"`. Fail the whole thing if source stock is insufficient.
- Frontend: Transfer form on the manager/admin inventory page.

## B6. PDF invoice
- `npm i pdfkit`. `GET /api/orders/:id/invoice` returns `application/pdf` only if the order is `Completed` (else 409) and visible to the caller (reuse `orderVisibilityFilter`).
- Content: order number, date, customer name/phone, warehouse, items table (name, qty, unit price, line total), grand total in Rs.
- Frontend: "Download Invoice" button on the order details page for Completed orders (use axios with `responseType: "blob"`).

## B7. Low-stock email to Admin
- `npm i nodemailer`. Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. If not configured, skip silently.
- `backend/src/utils/lowStockMailer.js`: after a stock-out or order processing, compute the product's total stock; if `<= lowStockLimit`, email all admins.
- Prevent spam: add `lowStockNotifiedAt: Date` on `Stock`; send only if null or older than 24 hours; reset to null when stock goes back above the limit.
- Sending must happen **after** the transaction commits and must never fail the API request.

---

# PART C: FINAL VERIFICATION (run and report results)

Write `backend/test/` tests (or a Postman collection `postman/inventory.postman_collection.json`) covering the instructor scenario:

1. Admin logs in, creates a manager and a sales rep, creates a warehouse and assigns the manager.
2. Create product "Laptop": price 80000, lowStockLimit 5, image via ImageKit.
3. Manager stock-in 20, then stock-out 3. Stock = 17 and 2 transactions exist.
4. Rep orders 2 Laptops. Total = 160000, status Pending. Processing makes stock 15.
5. Repeat the Processing request. It returns 409 and stock is still 15.
6. Order 999 Laptops. Rejected with insufficient stock.
7. Security: supplier `GET /api/users` returns 403; manager A cannot touch manager B's warehouse (403); rep A cannot read rep B's order (404); public register with `role: "admin"` still creates a `salesRepresentative`.
8. Supply request approved: stock increases once; second approval returns 409.
9. Capacity exceeded returns 400.

At the end, output a table: each task (A1…A6, B1…B7) with Done / Not done, files changed, and test result.
