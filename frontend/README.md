# STOCKNATION frontend

React, Vite, Tailwind CSS, Framer Motion and Axios frontend for the Inventory &
Warehouse Management API in `../backend`.

## Run locally

1. Install and start the backend using the instructions in `../backend/README.md`.
   Inventory changes and order processing require MongoDB Atlas or a replica set.
2. In this directory, run `npm install`.
3. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` to the backend origin
   (for example, `http://localhost:3000`; do not append `/api`).
4. Set the backend `FRONTEND_URL` to the Vite origin, usually `http://localhost:5173`,
   then run `npm run dev`.

Use `npm run build` to create the production bundle and `npm run preview` to serve it.

## Accounts and roles

Public registration creates a sales representative account. An administrator
creates warehouse manager and supplier accounts and configures warehouse access
from **Team & access**. Use the backend's one-time admin seed command to create
the initial administrator.

The interface uses the backend's cookie-based authentication and role-specific
API permissions. It does not keep JWTs in browser storage. A disconnected API is
reported in the sign-in flow; dashboard and management data are always fetched
from the backend rather than populated with demo records.

## Images

Product and profile images are uploaded directly to ImageKit using the short-lived
signature from `GET /api/imagekit/auth`. The backend still verifies uploaded
files and their URLs when a record is saved. Configure the ImageKit values in the
backend environment before using image uploads.

## API contract

The Axios client follows the backend routes, including `PATCH
/api/orders/:id/status`, `PATCH /api/orders/:id/cancel`, and `PATCH
/api/supply-requests/:id/review`. Set `VITE_API_BASE_URL` to the API origin; the
client appends `/api/...` to it.
