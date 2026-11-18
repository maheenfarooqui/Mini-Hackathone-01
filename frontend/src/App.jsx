import { lazy, Suspense } from "react";
import { Link, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Button, LoadingPage, PageHeader } from "./components/UI.jsx";
import AppLayout from "./layout/AppLayout.jsx";
import ProtectedRoute from "./routes/ProtectedRoute.jsx";

const LandingPage = lazy(() => import("./pages/PublicPages.jsx").then((module) => ({ default: module.LandingPage })));
const AuthPage = lazy(() => import("./pages/PublicPages.jsx").then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const ProductsPage = lazy(() => import("./pages/CatalogPages.jsx").then((module) => ({ default: module.ProductsPage })));
const UsersPage = lazy(() => import("./pages/CatalogPages.jsx").then((module) => ({ default: module.UsersPage })));
const WarehousesPage = lazy(() => import("./pages/CatalogPages.jsx").then((module) => ({ default: module.WarehousesPage })));
const SuppliersPage = lazy(() => import("./pages/CatalogPages.jsx").then((module) => ({ default: module.SuppliersPage })));
const InventoryPage = lazy(() => import("./pages/OperationsPages.jsx").then((module) => ({ default: module.InventoryPage })));
const StockMovementPage = lazy(() => import("./pages/OperationsPages.jsx").then((module) => ({ default: module.StockMovementPage })));
const TransactionsPage = lazy(() => import("./pages/OperationsPages.jsx").then((module) => ({ default: module.TransactionsPage })));
const LowStockPage = lazy(() => import("./pages/OperationsPages.jsx").then((module) => ({ default: module.LowStockPage })));
const OrdersPage = lazy(() => import("./pages/OrderPages.jsx").then((module) => ({ default: module.OrdersPage })));
const NewOrderPage = lazy(() => import("./pages/OrderPages.jsx").then((module) => ({ default: module.NewOrderPage })));
const SupplyRequestsPage = lazy(() => import("./pages/SupplyRequestPages.jsx").then((module) => ({ default: module.SupplyRequestsPage })));
const NewSupplyRequestPage = lazy(() => import("./pages/SupplyRequestPages.jsx").then((module) => ({ default: module.NewSupplyRequestPage })));
const SupplierProfilePage = lazy(() => import("./pages/SupplyRequestPages.jsx").then((module) => ({ default: module.SupplierProfilePage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));

const roles = {
  admin: ["admin"],
  manager: ["admin", "warehouseManager"],
  inventory: ["admin", "warehouseManager", "salesRepresentative"],
  orders: ["admin", "warehouseManager", "salesRepresentative"],
  supplyRequests: ["admin", "supplier"],
};

function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-orange/20 bg-orange/10 text-orange">
        <ShieldAlert size={24} />
      </span>
      <h1 className="mt-5 text-2xl font-semibold text-copy">This area isn’t available to your role.</h1>
      <p className="mt-2 text-sm text-muted">Your account doesn’t have permission to open this page. Contact your administrator if you need access.</p>
      <Link to="/app" className="mt-6 inline-flex"><Button variant="secondary"><ArrowLeft size={14} /> Back to overview</Button></Link>
    </div>
  );
}

function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="404" title="Page not found" description="This page may have moved or is not part of this workspace." />
      <Link to="/app"><Button variant="secondary"><ArrowLeft size={14} /> Return to overview</Button></Link>
    </>
  );
}

export default function App() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="access-denied" element={<AccessDeniedPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route element={<ProtectedRoute roles={["admin", "warehouseManager", "supplier", "salesRepresentative"]} />}>
              <Route path="products" element={<ProductsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={roles.admin} />}>
              <Route path="users" element={<UsersPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["admin", "warehouseManager", "supplier", "salesRepresentative"]} />}>
              <Route path="warehouses" element={<WarehousesPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={roles.inventory} />}>
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="low-stock" element={<LowStockPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={roles.manager} />}>
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="stock/in" element={<StockMovementPage type="in" />} />
              <Route path="stock/out" element={<StockMovementPage type="out" />} />
            </Route>
            <Route element={<ProtectedRoute roles={roles.orders} />}>
              <Route path="orders" element={<OrdersPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["salesRepresentative"]} />}>
              <Route path="orders/new" element={<NewOrderPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={roles.supplyRequests} />}>
              <Route path="supply-requests" element={<SupplyRequestsPage />} />
            </Route>
            <Route element={<ProtectedRoute roles={["supplier"]} />}>
              <Route path="supply-requests/new" element={<NewSupplyRequestPage />} />
              <Route path="supplier/profile" element={<SupplierProfilePage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
