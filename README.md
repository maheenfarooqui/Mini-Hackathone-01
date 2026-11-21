# Manage Your Goods

Inventory and warehouse management application with a React/Vite frontend and
Express/MongoDB API.

## Deployed URLs

- Frontend: https://mini-hackathone-01-8ofd.vercel.app
- API: https://mini-hackathone-01-8ofd.vercel.app/api
- Health check: https://mini-hackathone-01-8ofd.vercel.app/health

The production frontend uses the same-origin `/api` proxy configured in
`frontend/vercel.json`. For local development, set `VITE_API_BASE_URL` to the
backend origin, without a trailing `/api` (for example,
`http://localhost:5000`).

## Local setup

### Backend

1. Install Node.js 20 or newer and MongoDB Atlas or a local replica set.
2. In `backend`, run `npm install`.
3. Copy `backend/.env.example` to `backend/.env` and set the MongoDB, JWT,
   frontend origin, and ImageKit values.
4. Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, then run
   `npm run seed:admin` to create the first administrator.
5. Run `npm run dev` for development or `npm start` for production.

MongoDB transactions require a replica set. Set `FRONTEND_URL` to the exact
frontend origin; multiple allowed origins may be comma-separated. Google OAuth
is optional and requires the three `GOOGLE_*` values.

### Frontend

1. In `frontend`, run `npm install`.
2. Optionally create `frontend/.env` with
   `VITE_API_BASE_URL=http://localhost:5000`.
3. Run `npm run dev`; the frontend normally listens on
   `http://localhost:5173`.
4. Run `npm run build` to create a production build.

## Roles

| Role | Access |
| --- | --- |
| Administrator | Manage users, products, warehouses, supply requests, and all records |
| Warehouse manager | Manage products; manage stock and review requests in assigned warehouses |
| Supplier | Manage own profile and supply requests; view associated products |
| Sales representative | Search inventory and create/view/cancel own pending orders |

Public registration always creates a sales representative. An administrator
creates manager and supplier accounts and assigns warehouse access.

### Demo-only credential examples

These are documentation-only examples, not deployed credentials or pre-created
accounts. Create equivalent users in a disposable demo database before using
them. Do not reuse these passwords or use them in production.

| Role | Example email | Demo-only password |
| --- | --- | --- |
| Administrator | `admin.demo@example.test` | `DemoOnly-Admin-2026!` |
| Warehouse manager | `manager.demo@example.test` | `DemoOnly-Manager-2026!` |
| Supplier | `supplier.demo@example.test` | `DemoOnly-Supplier-2026!` |
| Sales representative | `sales.demo@example.test` | `DemoOnly-Sales-2026!` |

## API overview

All endpoints below are prefixed with `/api`. Private endpoints require the
HTTP-only `token` cookie or an `Authorization: Bearer <token>` header.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login`, `/auth/logout` | Register, sign in, and sign out |
| GET | `/auth/me` | Get current account |
| GET/POST | `/users` | List/create users (admin) |
| PUT/DELETE | `/users/:id` | Update/delete user (admin) |
| PATCH | `/users/me/profile` | Update own profile |
| GET/POST | `/products` | List products; create (admin/manager) |
| GET/PUT/DELETE | `/products/:id` | Read/update; delete (admin only) |
| GET/POST | `/warehouses` | List/create warehouses |
| GET/PUT/DELETE | `/warehouses/:id` | Read/update/delete warehouse |
| POST | `/stock/in`, `/stock/out` | Add/remove warehouse stock |
| POST | `/stock/transfer` | Transfer stock (admin or manager assigned to both warehouses) |
| GET | `/stock`, `/stock/low`, `/transactions` | Inventory, low stock, and movements |
| POST/GET | `/orders` | Create/list orders |
| GET | `/orders/:id` | Read a visible order |
| GET | `/orders/:id/invoice` | Download a PDF invoice for a visible completed order |
| PATCH/PUT | `/orders/:id/status` | Process or complete an order |
| PATCH/PUT | `/orders/:id/cancel` | Cancel a pending order |
| GET/PATCH | `/suppliers/me` | Read/update supplier profile |
| GET/POST | `/supply-requests` | List/submit supply requests |
| PATCH | `/supply-requests/:id/review` | Approve/reject a request |
| PUT | `/supply-requests/:id/status` | Alias for supply-request review |
| GET | `/dashboard` | Role-scoped dashboard data |
| GET | `/activity` | Admin-only activity log |
| GET | `/reports/sales-monthly`, `/reports/stock-movement`, `/reports/top-products` | Admin/manager-scoped reports |
| GET | `/imagekit/auth`, `/upload/auth` | Get upload signature |
| DELETE | `/imagekit/files/:fileId` | Delete an unreferenced ImageKit file (admin) |

Stock requests accept `productId`/`warehouseId` and their legacy aliases
`product`/`warehouse`. Orders accept `warehouse` as an alias for `warehouseId`
and `product` as an alias for each item’s `productId`. Supply-request approval
adds stock and records its transaction atomically.

Low-stock email alerts are optional; configure `SMTP_HOST`, `SMTP_PORT`,
`SMTP_USER`, `SMTP_PASS`, and `MAIL_FROM` to enable them. Notifications are
deduplicated for 24 hours and reset after stock recovers above the product limit.

## Tests

Run backend tests with `cd backend && npm test`. Run the frontend production
build with `cd frontend && npm run build`.
