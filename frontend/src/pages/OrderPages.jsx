import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { orderApi } from "../api/orderApi.js";
import { productApi } from "../api/productApi.js";
import { warehouseApi } from "../api/warehouseApi.js";
import { getApiError } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  formatCurrency,
  formatDate,
  getName,
  Modal,
  PageHeader,
} from "../components/UI.jsx";

export function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [busyId, setBusyId] = useState("");
  const canProcess = user.role === "admin" || user.role === "warehouseManager";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderApi.list({
        limit: 100,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setOrders(response.orders || []);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(order, status) {
    const action = status === "Processing" ? "process this order and deduct its stock" : "mark this order completed";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setBusyId(order._id);
    try {
      await orderApi.updateStatus(order._id, status);
      toast.success(status === "Processing" ? "Order processed and stock updated." : "Order completed.");
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setBusyId("");
    }
  }

  async function cancelOrder(order) {
    if (!window.confirm(`Cancel ${order.orderNumber}? Only pending orders can be cancelled.`)) return;
    setBusyId(order._id);
    try {
      await orderApi.cancel(order._id);
      toast.success("Order cancelled.");
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setBusyId("");
    }
  }

  const columns = [
    { key: "orderNumber", label: "Order", render: (order) => <button onClick={() => setSelectedOrder(order)} className="font-semibold text-copy hover:text-orange">{order.orderNumber}</button> },
    { key: "customerName", label: "Customer", render: (order) => <div><p>{order.customerName}</p><p className="mt-1 text-[10px] text-muted">{order.customerPhone}</p></div> },
    { key: "warehouse", label: "Warehouse", render: (order) => getName(order.warehouse) },
    { key: "products", label: "Items", render: (order) => `${order.products?.length || 0} product${order.products?.length === 1 ? "" : "s"}` },
    { key: "totalAmount", label: "Total", render: (order) => <span className="font-medium">{formatCurrency(order.totalAmount)}</span> },
    { key: "createdAt", label: "Created", render: (order) => formatDate(order.createdAt) },
    { key: "status", label: "Status", render: (order) => <Badge>{order.status}</Badge> },
    {
      key: "actions",
      label: "Actions",
      className: "w-44",
      render: (order) => (
        <div className="flex items-center justify-end gap-2">
          {canProcess && order.status === "Pending" && (
            <Button size="sm" disabled={busyId === order._id} onClick={() => changeStatus(order, "Processing")}>Process</Button>
          )}
          {canProcess && order.status === "Processing" && (
            <Button size="sm" variant="secondary" disabled={busyId === order._id} onClick={() => changeStatus(order, "Completed")}>Complete</Button>
          )}
          {(order.status === "Pending" && (user.role === "salesRepresentative" || canProcess)) && (
            <Button size="sm" variant="ghost" disabled={busyId === order._id} onClick={() => cancelOrder(order)} className="text-red-300">Cancel</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Order management"
        title={user.role === "salesRepresentative" ? "My orders" : "Sales orders"}
        description={canProcess ? "Review order status and process stock-backed fulfillment." : "Review the sales orders created from your account."}
        actions={user.role === "salesRepresentative" && <Link to="/app/orders/new"><Button><ShoppingCart size={15} /> Create order</Button></Link>}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="text-sm font-semibold">Order list</p><p className="mt-1 text-[11px] text-muted">{orders.length} orders loaded</p></div>
          <Field as="select" aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="sm:w-48">
            <option value="">All statuses</option>
            {["Pending", "Processing", "Completed", "Cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}
          </Field>
        </div>
        <DataTable columns={columns} rows={orders} loading={loading} emptyTitle="No orders found" emptyText="Orders will appear here as your team creates them." />
      </Card>

      {selectedOrder && (
        <Modal title={selectedOrder.orderNumber} description={`Created ${formatDate(selectedOrder.createdAt)} · ${getName(selectedOrder.warehouse)}`} onClose={() => setSelectedOrder(null)}>
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div><p className="text-xs text-muted">Customer</p><p className="mt-1 text-sm font-medium">{selectedOrder.customerName}</p><p className="mt-1 text-xs text-muted">{selectedOrder.customerPhone}</p></div>
            <Badge>{selectedOrder.status}</Badge>
          </div>
          <div className="my-4 space-y-3">
            {selectedOrder.products?.map((item, index) => (
              <div key={item._id || `${item.product?._id}-${index}`} className="flex items-center justify-between gap-3 text-xs">
                <div><p className="font-medium text-copy">{getName(item.product)}</p><p className="mt-1 text-[10px] text-muted">{item.product?.sku} · {item.quantity} units × {formatCurrency(item.price)}</p></div>
                <span className="font-semibold">{formatCurrency(item.quantity * item.price)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
            <span className="text-muted">Order total</span><span className="font-semibold">{formatCurrency(selectedOrder.totalAmount)}</span>
          </div>
        </Modal>
      )}
    </>
  );
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    warehouseApi.list()
      .then(({ warehouses: result }) => {
        setWarehouses(result || []);
        if (result?.length === 1) setWarehouseId(result[0]._id);
      })
      .catch((error) => toast.error(getApiError(error)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!warehouseId) {
      setProducts([]);
      return;
    }
    productApi.list({ warehouse: warehouseId, available: "true" })
      .then((response) => setProducts(response.products || []))
      .catch((error) => toast.error(getApiError(error)));
  }, [warehouseId]);

  const selectedProducts = useMemo(
    () => items.map((item) => products.find((product) => product._id === item.productId)).filter(Boolean),
    [items, products],
  );
  const total = items.reduce((sum, item) => {
    const product = products.find((entry) => entry._id === item.productId);
    return sum + (product ? product.price * Number(item.quantity || 0) : 0);
  }, 0);

  function updateItem(index, patch) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addItem() {
    setItems((current) => [...current, { productId: "", quantity: 1 }]);
  }

  function removeItem(index) {
    setItems((current) => current.length > 1 ? current.filter((_, itemIndex) => itemIndex !== index) : current);
  }

  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (!warehouseId || items.some((item) => !item.productId || Number(item.quantity) < 1)) {
      toast.error("Choose a warehouse, product and valid quantity for each line.");
      return;
    }
    setSaving(true);
    try {
      await orderApi.create({
        customerName: values.customerName,
        customerPhone: values.customerPhone,
        warehouseId,
        products: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
      });
      toast.success("Sales order created.");
      navigate("/app/orders");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Sales orders"
        title="Create an order"
        description="Build a sales order from products currently available at the selected warehouse."
        actions={<Link to="/app/orders" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 text-xs font-semibold text-copy hover:bg-slate-100"><ArrowLeft size={14} /> Back to orders</Link>}
      />
      <form onSubmit={submit} className="grid gap-4 xl:grid-cols-[1fr_350px]">
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <p className="text-sm font-semibold">Customer details</p>
            <p className="mt-1 text-[11px] text-muted">Enter the contact details for this order.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Customer name" name="customerName" required maxLength={120} placeholder="Customer or business name" />
              <Field label="Customer phone" name="customerPhone" type="tel" required maxLength={40} placeholder="+92 300 0000000" />
              <Field label="Fulfillment warehouse" as="select" value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setItems([{ productId: "", quantity: 1 }]); }} required disabled={loading}>
                <option value="">Select a warehouse</option>
                {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name} · {warehouse.location}</option>)}
              </Field>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div><p className="text-sm font-semibold">Order items</p><p className="mt-1 text-[11px] text-muted">Prices are confirmed by the server.</p></div>
              <Button variant="secondary" size="sm" onClick={addItem} disabled={!warehouseId || products.length === 0}><Plus size={14} /> Add item</Button>
            </div>
            <div className="space-y-3 p-5 sm:p-6">
              {!warehouseId ? (
                <p className="rounded-xl border border-line bg-ink/35 px-4 py-8 text-center text-xs text-muted">Select a warehouse to see available products.</p>
              ) : products.length === 0 ? (
                <p className="rounded-xl border border-line bg-ink/35 px-4 py-8 text-center text-xs text-muted">No products currently have stock in this warehouse.</p>
              ) : items.map((item, index) => {
                const product = products.find((entry) => entry._id === item.productId);
                return (
                  <div key={index} className="grid gap-3 rounded-xl border border-line/80 bg-ink/35 p-3 sm:grid-cols-[minmax(0,1fr)_120px_40px] sm:items-end">
                    <Field label={index === 0 ? "Product" : `Product ${index + 1}`} as="select" value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })} required>
                      <option value="">Select product</option>
                      {products.map((entry) => <option key={entry._id} value={entry._id}>{entry.name} · {entry.sku} · {entry.quantity} in stock</option>)}
                    </Field>
                    <Field label="Quantity" type="number" min="1" step="1" max={product?.quantity} value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} required />
                    <button type="button" onClick={() => removeItem(index)} className="mb-0.5 flex h-10 w-10 items-center justify-center rounded-xl text-muted transition hover:bg-red-400/10 hover:text-red-300" aria-label="Remove item" disabled={items.length === 1}><Trash2 size={15} /></button>
                    {product && <p className="text-[10px] text-muted sm:col-span-3">Unit price {formatCurrency(product.price)} · {product.quantity} units available</p>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <Card className="h-fit p-5 sm:p-6 xl:sticky xl:top-[92px]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-orange"><ShoppingCart size={18} /></span>
          <h2 className="mt-4 text-sm font-semibold">Order summary</h2>
          <p className="mt-1 text-[11px] text-muted">{selectedProducts.length} selected line items</p>
          <div className="my-5 space-y-3 border-y border-line py-4">
            {items.map((item, index) => {
              const product = products.find((entry) => entry._id === item.productId);
              return product ? <div key={index} className="flex justify-between gap-3 text-xs"><span className="truncate text-muted">{product.name} × {item.quantity}</span><span className="shrink-0 text-copy">{formatCurrency(product.price * Number(item.quantity || 0))}</span></div> : null;
            })}
            {selectedProducts.length === 0 && <p className="text-xs text-muted">Add products to calculate the order estimate.</p>}
          </div>
          <div className="flex items-center justify-between text-sm"><span className="text-muted">Estimated total</span><span className="font-semibold text-copy">{formatCurrency(total)}</span></div>
          <p className="mt-2 text-[10px] leading-5 text-muted">The final price and available stock are validated by the server when you submit.</p>
          <Button type="submit" disabled={saving || loading || !warehouseId || selectedProducts.length === 0} className="mt-5 w-full">
            {saving ? "Creating order…" : "Submit order"} <ArrowRight size={14} />
          </Button>
        </Card>
      </form>
    </>
  );
}
