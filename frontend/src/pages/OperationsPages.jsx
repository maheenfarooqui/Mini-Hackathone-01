import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  Clock3,
  Package,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import { productApi } from "../api/productApi.js";
import { stockApi } from "../api/stockApi.js";
import { transactionApi } from "../api/transactionApi.js";
import { warehouseApi } from "../api/warehouseApi.js";
import { getApiError } from "../api/axios.js";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  formatDate,
  getName,
  PageHeader,
  StatCard,
} from "../components/UI.jsx";

export function InventoryPage() {
  const [stocks, setStocks] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stockData, warehouseData] = await Promise.all([
        stockApi.list({ limit: 100, ...(warehouse ? { warehouse } : {}) }),
        warehouseApi.list(),
      ]);
      setStocks(stockData.stocks || []);
      setWarehouses(warehouseData.warehouses || []);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [warehouse]);

  useEffect(() => { load(); }, [load]);

  const unitCount = stocks.reduce((total, stock) => total + Number(stock.quantity || 0), 0);
  const columns = [
    {
      key: "product",
      label: "Product",
      render: (stock) => (
        <div className="flex items-center gap-3">
          {stock.product?.imageUrl ? <img src={stock.product.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-card text-orange"><Package size={16} /></span>}
          <div><p className="font-medium">{getName(stock.product)}</p><p className="mt-1 text-[10px] text-muted">{stock.product?.sku} · {stock.product?.category}</p></div>
        </div>
      ),
    },
    { key: "warehouse", label: "Warehouse", render: (stock) => getName(stock.warehouse) },
    {
      key: "quantity",
      label: "On hand",
      render: (stock) => <span className={stock.quantity <= (stock.product?.lowStockLimit ?? -1) ? "font-semibold text-amber-200" : "font-semibold"}>{stock.quantity}</span>,
    },
    {
      key: "stockStatus",
      label: "Status",
      render: (stock) => stock.quantity <= (stock.product?.lowStockLimit ?? -1) ? <Badge>Low stock</Badge> : <Badge>Healthy</Badge>,
    },
    { key: "updatedAt", label: "Last updated", render: (stock) => formatDate(stock.updatedAt) },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Stock control"
        title="Inventory"
        description="Live product quantities across your warehouse locations."
        actions={<Button variant="secondary" onClick={load}><RefreshCw size={14} /> Refresh</Button>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="Stock records" value={stocks.length.toLocaleString()} note="Product / warehouse pairs" icon={Boxes} />
        <StatCard label="Units on hand" value={unitCount.toLocaleString()} note="Across visible locations" icon={Package} tone="green" />
        <StatCard label="Low stock records" value={stocks.filter((stock) => stock.quantity <= (stock.product?.lowStockLimit ?? -1)).length.toLocaleString()} note="At or below product threshold" icon={ArrowDownRight} tone="amber" />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="text-sm font-semibold">Warehouse inventory</p><p className="mt-1 text-[11px] text-muted">{stocks.length} stock records loaded</p></div>
          <Field as="select" aria-label="Filter by warehouse" value={warehouse} onChange={(event) => setWarehouse(event.target.value)} className="sm:w-64">
            <option value="">All accessible warehouses</option>
            {warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </Field>
        </div>
        <DataTable columns={columns} rows={stocks} loading={loading} emptyTitle="No inventory records" emptyText="Stock will appear here after products are added to a warehouse." />
      </Card>
    </>
  );
}

export function StockMovementPage({ type }) {
  const isStockIn = type === "in";
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([productApi.list(), warehouseApi.list()])
      .then(([productData, warehouseData]) => {
        setProducts(productData.products || []);
        setWarehouses(warehouseData.warehouses || []);
      })
      .catch((error) => toast.error(getApiError(error)))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    const payload = { ...values, quantity: Number(values.quantity) };
    setSaving(true);
    try {
      if (isStockIn) await stockApi.add(payload);
      else await stockApi.remove(payload);
      toast.success(isStockIn ? "Stock added to the warehouse." : "Stock removed from the warehouse.");
      form.reset();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory operations"
        title={isStockIn ? "Receive stock" : "Dispatch stock"}
        description={isStockIn ? "Record incoming inventory and update warehouse quantities." : "Record stock leaving a warehouse. Available quantities are checked before dispatch."}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
        <Card className="p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${isStockIn ? "bg-emerald-300/10 text-emerald-200" : "bg-orange/10 text-orange"}`}>
              {isStockIn ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
            </span>
            <div><p className="text-sm font-semibold">{isStockIn ? "Stock-in record" : "Stock-out record"}</p><p className="mt-1 text-[11px] text-muted">Each entry creates an auditable movement.</p></div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Product" as="select" name="productId" required disabled={loading}>
              <option value="">Select a product</option>
              {products.map((product) => <option key={product._id} value={product._id}>{product.name} · {product.sku}</option>)}
            </Field>
            <Field label="Warehouse" as="select" name="warehouseId" required disabled={loading}>
              <option value="">Select a warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name} · {warehouse.location}</option>)}
            </Field>
            <Field label="Quantity" name="quantity" type="number" min="1" step="1" placeholder="Enter whole units" required />
            <Field label="Note (optional)" name="note" as="textarea" rows={3} maxLength={500} placeholder="Add a reference or reason for this movement" />
            <Button type="submit" disabled={saving || loading || products.length === 0 || warehouses.length === 0} className="w-full">
              {saving ? "Recording…" : isStockIn ? "Confirm stock in" : "Confirm stock out"}
            </Button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <p className="text-sm font-semibold">Movement rules</p>
            <ul className="mt-4 space-y-3 text-xs leading-5 text-muted">
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />Quantities must be positive whole numbers.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />Stock-out is limited to units currently available.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />Your warehouse manager role only has access to assigned locations.</li>
              <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" />Every successful update is saved in stock movement history.</li>
            </ul>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200"><Clock3 size={16} /></span>
              <div><p className="text-xs font-semibold">Need to review a movement?</p><p className="mt-1 text-[10px] text-muted">Open the full history for your visible warehouses.</p></div>
            </div>
            <a href="/app/transactions" className="mt-4 inline-flex text-xs font-semibold text-orange hover:text-orange-300">View stock movements →</a>
          </Card>
        </div>
      </div>
    </>
  );
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [filter, setFilter] = useState({ type: "", warehouse: "" });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, warehouseData] = await Promise.all([
        transactionApi.list({ limit: 100, ...(filter.type ? { type: filter.type } : {}), ...(filter.warehouse ? { warehouse: filter.warehouse } : {}) }),
        warehouseApi.list(),
      ]);
      setTransactions(data.transactions || []);
      setWarehouses(warehouseData.warehouses || []);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      key: "transactionType",
      label: "Movement",
      render: (record) => <Badge className={record.transactionType === "stock-in" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-orange/20 bg-orange/10 text-orange"}>{record.transactionType === "stock-in" ? "Stock in" : "Stock out"}</Badge>,
    },
    { key: "product", label: "Product", render: (record) => <div><p className="font-medium">{getName(record.product)}</p><p className="mt-1 text-[10px] text-muted">{record.product?.sku}</p></div> },
    { key: "warehouse", label: "Warehouse", render: (record) => getName(record.warehouse) },
    { key: "quantity", label: "Quantity", render: (record) => <span className="font-semibold">{record.transactionType === "stock-in" ? "+" : "−"}{record.quantity}</span> },
    { key: "performedBy", label: "Recorded by", render: (record) => getName(record.performedBy) },
    { key: "createdAt", label: "Date", render: (record) => formatDate(record.createdAt) },
  ];

  return (
    <>
      <PageHeader eyebrow="Audit trail" title="Stock movements" description="Review recorded inventory changes across your accessible locations." />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="text-sm font-semibold">Movement history</p><p className="mt-1 text-[11px] text-muted">{transactions.length} recent records</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Field as="select" aria-label="Filter movement type" value={filter.type} onChange={(event) => setFilter({ ...filter, type: event.target.value })} className="sm:w-40">
              <option value="">All movement types</option><option value="stock-in">Stock in</option><option value="stock-out">Stock out</option>
            </Field>
            <Field as="select" aria-label="Filter warehouse" value={filter.warehouse} onChange={(event) => setFilter({ ...filter, warehouse: event.target.value })} className="sm:w-52">
              <option value="">All warehouses</option>{warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
            </Field>
          </div>
        </div>
        <DataTable columns={columns} rows={transactions} loading={loading} emptyTitle="No stock movements found" emptyText="Incoming and outgoing inventory records will appear here." />
      </Card>
    </>
  );
}

export function LowStockPage() {
  const [items, setItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stockData, warehouseData] = await Promise.all([
        stockApi.low(warehouse ? { warehouse } : undefined),
        warehouseApi.list(),
      ]);
      setItems(stockData.products || []);
      setWarehouses(warehouseData.warehouses || []);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [warehouse]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    {
      key: "product",
      label: "Product",
      render: (item) => <div className="flex items-center gap-3">{item.product?.imageUrl ? <img src={item.product.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-orange"><Package size={16} /></span>}<div><p className="font-medium">{getName(item.product)}</p><p className="mt-1 text-[10px] text-muted">{item.product?.sku} · {item.product?.category}</p></div></div>,
    },
    { key: "quantity", label: "Current stock", render: (item) => <span className="font-semibold text-amber-200">{item.quantity}</span> },
    { key: "lowStockLimit", label: "Reorder threshold", render: (item) => item.product?.lowStockLimit ?? "—" },
    { key: "inventory", label: "Location breakdown", render: (item) => item.inventory?.length ? item.inventory.map((stock) => `${getName(stock.warehouse)}: ${stock.quantity}`).join(" · ") : "No stock recorded" },
    { key: "status", label: "Alert", render: () => <Badge>Low stock</Badge> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Replenishment"
        title="Low-stock alerts"
        description="Products whose current total quantity is at or below their reorder threshold."
        actions={<Button variant="secondary" onClick={load}><RefreshCw size={14} /> Refresh</Button>}
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <StatCard label="Products to review" value={items.length.toLocaleString()} note="Across visible warehouses" icon={Boxes} tone="amber" />
        <StatCard label="Filtered location" value={warehouse ? warehouses.find((item) => item._id === warehouse)?.name || "Selected" : "All locations"} note="Use the filter to narrow the list" icon={Package} tone="blue" />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="text-sm font-semibold">Reorder watchlist</p><p className="mt-1 text-[11px] text-muted">{items.length} products need a closer look</p></div>
          <Field as="select" aria-label="Filter by warehouse" value={warehouse} onChange={(event) => setWarehouse(event.target.value)} className="sm:w-64">
            <option value="">All accessible warehouses</option>{warehouses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </Field>
        </div>
        <DataTable columns={columns} rows={items} loading={loading} emptyTitle="No low-stock products" emptyText="There are no products at or below their reorder level." />
      </Card>
    </>
  );
}
