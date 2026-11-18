# Inventory and Warehouse Management API

Express and MongoDB backend for the inventory hackathon project. The API uses JWT
authentication, bcrypt password hashing, role-based authorization, and ImageKit
for images.

## Setup

1. Run `npm install` in this folder.
2. Copy `.env.example` to `.env` and set `MONGO_URI`, `JWT_SECRET`, and the three
   ImageKit values.
3. Create the first administrator by setting `ADMIN_NAME`, `ADMIN_EMAIL`, and
   `ADMIN_PASSWORD` in `.env`, then running `npm run seed:admin`. The seed command
   never creates or promotes an account if that email already exists.
4. Run `npm start`.

Stock changes and order processing use MongoDB transactions, so use MongoDB Atlas
or a replica-set deployment.

Public registration creates only `salesRepresentative` accounts. An admin creates
the other roles and assigns managers to warehouses through the user or warehouse
APIs. Keep `.env` private.

Legacy storefront product and order records are not converted; the inventory API
ignores products without an SKU and orders without an order number. Use a fresh
database for the hackathon or create new inventory records.

## Roles

- `admin`: manage users, products, warehouses, suppliers, and all records.
- `warehouseManager`: manage stock only in assigned warehouses; review orders and
  view their stock history.
- `supplier`: manage their own profile and supply requests, and view their own
  associated products.
- `salesRepresentative`: search inventory, create sales orders, and view/cancel
  only their own pending orders.

## API

All routes are prefixed with `/api`. Authenticated requests accept the HTTP-only
`token` cookie or an `Authorization: Bearer <token>` header.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | Public sales representative registration |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Current user |
| POST | `/auth/logout` | Clear login cookie |
| GET/POST | `/users` | List/create users (admin) |
| PATCH | `/users/me/profile` | Update own name, phone, and ImageKit profile image |
| PUT/DELETE | `/users/:id` | Update/delete user (admin) |
| GET/POST | `/products` | Search/list products; create (admin) |
| GET/PUT/DELETE | `/products/:id` | Read/update/delete product |
| GET/POST | `/warehouses` | List/create warehouses |
| GET/PUT/DELETE | `/warehouses/:id` | Read/update/delete warehouse |
| POST | `/stock/in`, `/stock/out` | Add/remove warehouse stock |
| GET | `/stock`, `/stock/low`, `/transactions` | Inventory, low-stock, movements |
| POST/GET | `/orders` | Create sales order; list visible orders |
| GET | `/orders/:id` | Read an order visible to the caller |
| PATCH | `/orders/:id/status` | Process or complete an order |
| PATCH | `/orders/:id/cancel` | Cancel a pending order |
| GET/PATCH | `/suppliers/me` | Supplier profile |
| GET/POST | `/supply-requests` | List/submit supply requests |
| PATCH | `/supply-requests/:id/review` | Approve/reject request (admin) |
| GET | `/dashboard` | Role-scoped statistics and low-stock list |
| GET | `/imagekit/auth` | Short-lived client upload signature |
| DELETE | `/imagekit/files/:fileId` | Delete an unreferenced ImageKit file (admin) |

Stock requests use `{ "productId", "warehouseId", "quantity", "note" }`.
Orders use `{ "customerName", "customerPhone", "warehouseId", "products":
[{ "productId", "quantity" }] }`. Prices are read from the database, not accepted
from clients. Orders are created as `Pending`; stock is deducted with a matching
stock-out transaction only on the `Pending` to `Processing` transition.

For uploads, call `/imagekit/auth`, upload from the client using the returned
`token`, `expire`, `signature`, `publicKey`, and `urlEndpoint`, then send the
returned `url` and `fileId` when saving a product or profile. The API confirms
the file against ImageKit and rejects non-image files, files over 5 MB, and URLs
that do not match the stored file.

`npm test` runs the focused order-transition tests. `/health` reports API and
MongoDB connection status.
