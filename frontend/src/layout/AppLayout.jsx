import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Boxes,
  Building2,
  ChevronDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  Truck,
  Users,
  UserRound,
  Warehouse,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext.jsx";
import { getApiError } from "../api/axios.js";
import { BrandName, cx, initials } from "../components/UI.jsx";

const roleLinks = {
  admin: [
    { label: "Overview", to: "/app", icon: LayoutDashboard },
    { label: "Products", to: "/app/products", icon: Package },
    { label: "Inventory", to: "/app/inventory", icon: Boxes },
    { label: "Warehouses", to: "/app/warehouses", icon: Warehouse },
    { label: "Sales orders", to: "/app/orders", icon: ShoppingCart },
    { label: "Stock movements", to: "/app/transactions", icon: Activity },
    { label: "Low stock", to: "/app/low-stock", icon: AlertTriangle },
    { label: "Supply requests", to: "/app/supply-requests", icon: ClipboardList },
    { label: "Suppliers", to: "/app/suppliers", icon: Truck },
    { label: "Team & access", to: "/app/users", icon: Users },
  ],
  warehouseManager: [
    { label: "Overview", to: "/app", icon: LayoutDashboard },
    { label: "Products", to: "/app/products", icon: Package },
    { label: "Inventory", to: "/app/inventory", icon: Boxes },
    { label: "Stock in", to: "/app/stock/in", icon: Package },
    { label: "Stock out", to: "/app/stock/out", icon: Package },
    { label: "Sales orders", to: "/app/orders", icon: ShoppingCart },
    { label: "Stock movements", to: "/app/transactions", icon: Activity },
    { label: "Low stock", to: "/app/low-stock", icon: AlertTriangle },
    { label: "Warehouses", to: "/app/warehouses", icon: Warehouse },
  ],
  supplier: [
    { label: "Overview", to: "/app", icon: LayoutDashboard },
    { label: "My products", to: "/app/products", icon: Package },
    { label: "My requests", to: "/app/supply-requests", icon: ClipboardList },
    { label: "Supplier profile", to: "/app/supplier/profile", icon: Building2 },
  ],
  salesRepresentative: [
    { label: "Overview", to: "/app", icon: LayoutDashboard },
    { label: "Products", to: "/app/products", icon: Package },
    { label: "Create order", to: "/app/orders/new", icon: ShoppingCart },
    { label: "My orders", to: "/app/orders", icon: ClipboardList },
  ],
};

const roleNames = {
  admin: "Administrator",
  warehouseManager: "Warehouse manager",
  supplier: "Supplier",
  salesRepresentative: "Sales representative",
};

function SidebarContent({ onNavigate }) {
  const { user } = useAuth();
  const links = roleLinks[user?.role] || [];
  const activeSection = useLocation().pathname;

  return (
    <div className="flex h-full flex-col">
      <Link to="/app" className="flex items-center gap-3 px-6 py-6" onClick={onNavigate}>
        <BrandName className="text-[17px]" />
      </Link>
      <div className="mx-5 border-t border-line/80" />
      <nav className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-muted/65">
          Workspace
        </p>
        {links.map(({ label, to, icon: Icon }) => {
          const isActive =
            activeSection === to ||
            (to !== "/app" &&
              activeSection.startsWith(`${to}/`) &&
              !(to === "/app/orders" && activeSection.startsWith(`${to}/new`)));
          return (
            <NavLink
              key={to}
              to={to}
              end={to === "/app"}
              onClick={onNavigate}
              className={cx(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition",
                isActive
                  ? "bg-orange/10 font-semibold text-orange"
                  : "text-muted hover:bg-white/[0.04] hover:text-copy",
              )}
            >
              <Icon size={16} className={cx("shrink-0", isActive ? "text-orange" : "text-muted/80 group-hover:text-copy")} />
              {label}
              {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-orange" />}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-line/80 p-4">
        <NavLink
          to="/app/profile"
          onClick={onNavigate}
          className={({ isActive }) =>
            cx(
              "mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] transition",
              isActive ? "bg-orange/10 font-semibold text-orange" : "text-muted hover:bg-white/[0.04] hover:text-copy",
            )
          }
        >
          <UserRound size={15} />
          My profile
        </NavLink>
        <div className="flex items-center gap-3 rounded-xl bg-card/70 p-3">
          {user?.image ? (
            <img src={user.image} alt="" className="h-9 w-9 rounded-xl object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange/15 text-xs font-bold text-orange">
              {initials(user?.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-copy">{user?.name}</p>
            <p className="mt-0.5 truncate text-[10px] text-muted">{roleNames[user?.role]}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
      toast.success("You’re signed out.");
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  return (
    <div className="min-h-screen bg-ink text-copy">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-line/80 bg-panel lg:block">
        <SidebarContent />
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/65 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            />
            <motion.aside
              initial={{ x: -270 }}
              animate={{ x: 0 }}
              exit={{ x: -270 }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 w-[270px] border-r border-line bg-panel lg:hidden"
            >
              <div className="absolute right-3 top-5">
                <button
                  className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-copy"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X size={18} />
                </button>
              </div>
              <SidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-line/70 bg-ink/85 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-copy lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <div className="hidden h-8 w-px bg-line sm:block" />
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/70">Your workspace</p>
              <p className="mt-0.5 text-xs font-semibold text-copy sm:text-sm">
                {roleNames[user?.role] || "Manage Your Goods"}
              </p>
            </div>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-line bg-panel/70 py-1.5 pl-1.5 pr-2.5 transition hover:bg-card"
              aria-expanded={menuOpen}
            >
              {user?.image ? (
                <img src={user.image} alt="" className="h-8 w-8 rounded-lg object-cover" />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange/15 text-[11px] font-bold text-orange">
                  {initials(user?.name)}
                </span>
              )}
              <span className="hidden max-w-[140px] truncate text-xs font-medium text-copy sm:block">{user?.name}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>
            {menuOpen && (
              <>
                <button
                  className="fixed inset-0 z-20 cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close account menu"
                />
                <div className="absolute right-0 top-[calc(100%+8px)] z-30 w-52 rounded-xl border border-line bg-panel p-2 shadow-2xl">
                  <div className="border-b border-line px-3 py-2">
                    <p className="truncate text-xs font-medium text-copy">{user?.name}</p>
                    <p className="mt-1 truncate text-[10px] text-muted">{user?.email}</p>
                  </div>
                  <Link
                    to="/app/profile"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-muted transition hover:bg-white/5 hover:text-copy"
                  >
                    <UserRound size={14} />
                    My profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-red-300 transition hover:bg-red-400/10"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 sm:py-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
