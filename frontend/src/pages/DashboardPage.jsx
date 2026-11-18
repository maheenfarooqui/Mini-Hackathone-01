import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dashboardApi } from "../api/dashboardApi.js";
import { orderApi } from "../api/orderApi.js";
import { productApi } from "../api/productApi.js";
import { supplierApi } from "../api/supplierApi.js";
import { transactionApi } from "../api/transactionApi.js";
import { getApiError } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  formatCurrency,
  formatDate,
  getName,
  PageHeader,
  StatCard,
} from "../components/UI.jsx";
import toast from "react-hot-toast";

const chartTooltip = {
  contentStyle: {
    background: "#18242b",
    border: "1px solid #354149",
    borderRadius: 12,
    color: "#f4f5f6",
    fontSize: 11,
  },
  labelStyle: { color: "#a7b0b5", marginBottom: 4 },
  itemStyle: { color: "#ff5a0a" },
};

function activityForWeek(records, valueKey) {
  const days = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    const key = date.toLocaleDateString("en-CA");
    const matching = records.filter((record) => {
      if (!record.createdAt) return false;
      return new Date(record.createdAt).toLocaleDateString("en-CA") === key;
    });
    days.push({
      day: date.toLocaleDateString("en", { weekday: "short" }),
      value: matching.reduce((total, record) => total + Number(record[valueKey] || 1), 0),
    });
  }
  return days;
}

function StatIcon({ label }) {
  const Icon =
    label === "Products"
      ? Package
      : label === "Warehouses"
        ? Warehouse
        : label === "Orders"
          ? ShoppingCart
          : label === "Users"
            ? Users
            : label === "Suppliers"
              ? Truck
              : label === "Stock movements"
                ? Activity
                : label === "Supply requests"
                  ? ClipboardList
                  : AlertTriangle;
  return Icon;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const isSupplier = user.role === "supplier";
    Promise.all([
      dashboardApi.get(),
      productApi.list(),
      isSupplier
        ? Promise.resolve({ orders: [] })
        : orderApi.list({ limit: 100 }),
      user.role === "admin" || user.role === "warehouseManager"
        ? transactionApi.list({ limit: 100 })
        : Promise.resolve({ transactions: [] }),
      isSupplier ? supplierApi.requests() : Promise.resolve({ requests: [] }),
    ])
      .then(([dashboard, productData, orderData, transactionData, requestData]) => {
        if (!active) return;
        setData(dashboard);
        setProducts(productData.products || []);
        setOrders(orderData.orders || []);
        setTransactions(transactionData.transactions || []);
        setRequests(requestData.requests || []);
      })
      .catch((error) => {
        if (!active) return;
        setFailed(true);
        toast.error(getApiError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user.role]);

  const statistics = data?.statistics || {};
  const lowStock = data?.lowStockProducts || [];
  const metricItems = [
    ...(statistics.users !== undefined ? [["Users", statistics.users, "Team members"]] : []),
    ["Products", statistics.products ?? products.length, "In the catalog"],
    ["Warehouses", statistics.warehouses ?? 0, "Connected locations"],
    ...(statistics.suppliers !== undefined ? [["Suppliers", statistics.suppliers, "Supply partners"]] : []),
    ...(statistics.orders !== undefined ? [["Orders", statistics.orders, "Sales orders"]] : []),
    ...(statistics.transactions !== undefined ? [["Stock movements", statistics.transactions, "Recorded movements"]] : []),
    ...(statistics.supplyRequests !== undefined ? [["Supply requests", statistics.supplyRequests, "Requests received"]] : []),
    ["Low stock", statistics.lowStockProducts ?? lowStock.length, "Needs attention"],
  ];

  const activity = useMemo(() => {
    if (user.role === "admin" || user.role === "warehouseManager") {
      return activityForWeek(transactions, "quantity");
    }
    if (user.role === "supplier") {
      return ["Pending", "Approved", "Rejected"].map((status) => ({
        day: status,
        value: requests.filter((request) => request.status === status).length,
      }));
    }
    return activityForWeek(orders, "totalAmount");
  }, [user.role, transactions, orders, requests]);

  const orderColumns = [
    {
      key: "orderNumber",
      label: "Order",
      render: (row) => <span className="font-semibold">{row.orderNumber}</span>,
    },
    { key: "customerName", label: "Customer" },
    { key: "warehouse", label: "Warehouse", render: (row) => getName(row.warehouse) },
    { key: "totalAmount", label: "Total", render: (row) => formatCurrency(row.totalAmount) },
    { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
  ];

  return (
    <>
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" })}
        title={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user.name?.split(" ")[0] || "there"}.`}
        description="Here’s what’s happening across your operation today."
        actions={
          user.role === "salesRepresentative" ? (
            <Link to="/app/orders/new"><Button><ShoppingCart size={15} /> Create an order</Button></Link>
          ) : user.role === "supplier" ? (
            <Link to="/app/supply-requests/new"><Button><ClipboardList size={15} /> New supply request</Button></Link>
          ) : user.role === "warehouseManager" ? (
            <Link to="/app/stock/in"><Button><ArrowDownRight size={15} /> Record stock in</Button></Link>
          ) : (
            <Link to="/app/products"><Button><Package size={15} /> Add product</Button></Link>
          )
        }
      />

      {failed && !data ? (
        <Card><EmptyState title="Dashboard data is unavailable" description="Reconnect to the API and try loading your workspace again." action={<Button onClick={() => window.location.reload()}>Reload dashboard</Button>} /></Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metricItems.map(([label, value, note], index) => (
              <StatCard
                key={label}
                label={label}
                value={loading ? "—" : Number(value).toLocaleString()}
                note={note}
                icon={StatIcon({ label })}
                tone={label === "Low stock" && Number(value) > 0 ? "amber" : ["Warehouses", "Stock movements"].includes(label) ? "blue" : index % 3 === 1 ? "green" : "orange"}
              />
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_0.85fr]">
            <Card className="p-5 sm:p-6">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-copy">
                    {user.role === "supplier" ? "Request overview" : user.role === "salesRepresentative" ? "Order activity" : "Stock movement activity"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted">
                    {user.role === "supplier" ? "Your request statuses" : "Activity from the last 7 days"}
                  </p>
                </div>
                {(user.role === "admin" || user.role === "warehouseManager") && (
                  <Link to="/app/transactions" className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange hover:text-orange-300">
                    View movements <ArrowUpRight size={13} />
                  </Link>
                )}
              </div>
              <div className="h-[245px] w-full">
                {!loading && activity.every((point) => point.value === 0) ? (
                  <div className="flex h-full items-center justify-center text-xs text-muted">No activity recorded for this period.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activity} margin={{ top: 5, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke="#354149" strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="day" tick={{ fill: "#829097", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "#829097", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip {...chartTooltip} />
                      <Bar dataKey="value" name={user.role === "salesRepresentative" ? "Order value (Rs)" : user.role === "supplier" ? "Requests" : "Units moved"} radius={[5, 5, 0, 0]} maxBarSize={38}>
                        {activity.map((point) => <Cell key={point.day} fill={point.value ? "#ff5a0a" : "#354149"} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-copy">Low-stock watch</p>
                  <p className="mt-1 text-[11px] text-muted">Products at or below reorder level</p>
                </div>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200">
                  <AlertTriangle size={15} />
                </span>
              </div>
              <div className="space-y-2">
                {lowStock.slice(0, 4).map((item) => (
                  <div key={item.product._id} className="flex items-center justify-between gap-3 rounded-xl border border-line/70 bg-ink/40 px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-copy">{item.product.name}</p>
                      <p className="mt-1 text-[10px] text-muted">{item.product.sku} · reorder at {item.product.lowStockLimit}</p>
                    </div>
                    <Badge className="shrink-0">{item.quantity} left</Badge>
                  </div>
                ))}
                {!loading && lowStock.length === 0 && (
                  <div className="rounded-xl border border-line/70 bg-ink/40 px-3 py-8 text-center text-xs text-muted">
                    Everything is above its reorder level.
                  </div>
                )}
                {loading && <div className="h-24 animate-pulse rounded-xl bg-card/60" />}
              </div>
              <Link to="/app/low-stock" className="mt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-orange hover:text-orange-300">
                See all low-stock items <ArrowRight size={13} />
              </Link>
            </Card>
          </div>

          {user.role !== "supplier" && (
            <Card className="mt-5 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-copy">Recent sales orders</h2>
                  <p className="mt-1 text-[11px] text-muted">The latest orders visible to your account</p>
                </div>
                <Link to="/app/orders" className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange hover:text-orange-300">
                  All orders <ArrowRight size={13} />
                </Link>
              </div>
              <DataTable
                columns={orderColumns}
                rows={orders.slice(0, 5)}
                loading={loading}
                emptyTitle="No sales orders"
                emptyText="Orders will appear here as your team creates them."
              />
            </Card>
          )}

          {(user.role === "supplier" || user.role === "salesRepresentative") && products.length > 0 && (
            <Card className="mt-5 overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6">
                <div>
                  <h2 className="text-sm font-semibold text-copy">{user.role === "supplier" ? "Your products" : "Product catalog"}</h2>
                  <p className="mt-1 text-[11px] text-muted">{products.length} catalog products</p>
                </div>
                <Link to="/app/products" className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange hover:text-orange-300">
                  View catalog <ArrowRight size={13} />
                </Link>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                {products.slice(0, 3).map((product) => (
                  <div key={product._id} className="flex items-center gap-3 rounded-xl border border-line/70 bg-ink/40 p-3">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-card text-orange"><Package size={17} /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-copy">{product.name}</p>
                      <p className="mt-1 truncate text-[10px] text-muted">{product.sku} · {formatCurrency(product.price)}</p>
                    </div>
                    {product.quantity !== undefined && <span className="text-xs font-semibold text-copy">{product.quantity}</span>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </>
  );
}
