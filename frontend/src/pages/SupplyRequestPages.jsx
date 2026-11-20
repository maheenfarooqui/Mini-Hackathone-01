import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardList, Plus, Send, ShieldCheck, Truck } from "lucide-react";
import toast from "react-hot-toast";
import { supplierApi } from "../api/supplierApi.js";
import { productApi } from "../api/productApi.js";
import { warehouseApi } from "../api/warehouseApi.js";
import { getApiError } from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ImageUpload from "../components/ImageUpload.jsx";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Field,
  formatDate,
  getName,
  Modal,
  PageHeader,
} from "../components/UI.jsx";

export function SupplyRequestsPage() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [review, setReview] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supplierApi.requests(status ? { status } : undefined);
      setRequests(data.requests || []);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function submitReview(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);
    try {
      await supplierApi.reviewRequest(review.id, review.status, values.reviewNote);
      toast.success(`Supply request ${review.status.toLowerCase()}.`);
      setReview(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  const columns = [
    { key: "product", label: "Product", render: (request) => <div><p className="font-medium">{getName(request.product)}</p><p className="mt-1 text-[10px] text-muted">{request.product?.sku}</p></div> },
    ...(isAdmin ? [{ key: "supplier", label: "Supplier", render: (request) => <div><p>{getName(request.supplier)}</p><p className="mt-1 text-[10px] text-muted">{request.supplier?.email}</p></div> }] : []),
    { key: "warehouse", label: "Delivery warehouse", render: (request) => <div><p>{getName(request.warehouse)}</p><p className="mt-1 text-[10px] text-muted">{request.warehouse?.location}</p></div> },
    { key: "quantity", label: "Quantity", render: (request) => <span className="font-semibold">{Number(request.quantity).toLocaleString()}</span> },
    { key: "createdAt", label: "Submitted", render: (request) => formatDate(request.createdAt) },
    { key: "status", label: "Status", render: (request) => <Badge>{request.status}</Badge> },
    ...(isAdmin ? [{
      key: "actions",
      label: "Review",
      className: "w-40",
      render: (request) => request.status === "Pending" ? (
        <div className="flex justify-end gap-2">
          <Button size="sm" onClick={() => setReview({ id: request._id, status: "Approved", request })}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => setReview({ id: request._id, status: "Rejected", request })}>Reject</Button>
        </div>
      ) : <span className="text-[10px] text-muted">{request.reviewedBy ? `Reviewed by ${getName(request.reviewedBy)}` : "Reviewed"}</span>,
    }] : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Supply chain"
        title={isAdmin ? "Supply requests" : "My supply requests"}
        description={isAdmin ? "Review incoming product replenishment requests from suppliers." : "Track the status of your product replenishment requests."}
        actions={!isAdmin && <Link to="/app/supply-requests/new"><Button><Plus size={15} /> New request</Button></Link>}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div><p className="text-sm font-semibold">Request log</p><p className="mt-1 text-[11px] text-muted">{requests.length} requests</p></div>
          <Field as="select" aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className="sm:w-44">
            <option value="">All statuses</option>
            {["Pending", "Approved", "Rejected"].map((item) => <option key={item} value={item}>{item}</option>)}
          </Field>
        </div>
        <DataTable columns={columns} rows={requests} loading={loading} emptyTitle="No supply requests" emptyText={isAdmin ? "Requests submitted by suppliers will appear here." : "Create a request when your products need replenishing."} />
      </Card>
      {review && (
        <Modal
          title={`${review.status} request`}
          description={`${getName(review.request.product)} · ${review.request.quantity} units to ${getName(review.request.warehouse)}`}
          onClose={() => setReview(null)}
        >
          <form onSubmit={submitReview} className="space-y-4">
            <div className={`rounded-xl border px-4 py-3 text-xs leading-5 ${review.status === "Approved" ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-100" : "border-red-300/20 bg-red-300/[0.06] text-red-100"}`}>
              {review.status === "Approved"
                ? "Approving confirms the replenishment request. It does not automatically add stock."
                : "Rejecting closes this request. A note can explain the decision to the supplier."}
            </div>
            <Field label="Review note (optional)" name="reviewNote" as="textarea" rows={3} maxLength={500} placeholder="Add a note for the supplier" />
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setReview(null)}>Cancel</Button>
              <Button type="submit" variant={review.status === "Rejected" ? "danger" : "primary"} disabled={saving}>{saving ? "Saving…" : `Confirm ${review.status.toLowerCase()}`}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function NewSupplyRequestPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);
    try {
      await supplierApi.createRequest({
        productId: values.productId,
        warehouseId: values.warehouseId,
        quantity: Number(values.quantity),
      });
      toast.success("Supply request submitted.");
      navigate("/app/supply-requests");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Supplier workspace"
        title="Request replenishment"
        description="Send a replenishment request for one of the products associated with your account."
        actions={<Link to="/app/supply-requests" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-card px-4 text-xs font-semibold text-copy hover:bg-slate-100"><ArrowRight size={14} className="rotate-180" /> Request history</Link>}
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.78fr]">
        <Card className="p-5 sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-orange"><Truck size={18} /></span>
            <div><p className="text-sm font-semibold">New supply request</p><p className="mt-1 text-[11px] text-muted">The request will be sent to the administrator for review.</p></div>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <Field label="Product" as="select" name="productId" required disabled={loading}>
              <option value="">Select one of your products</option>
              {products.map((product) => <option key={product._id} value={product._id}>{product.name} · {product.sku}</option>)}
            </Field>
            <Field label="Delivery warehouse" as="select" name="warehouseId" required disabled={loading}>
              <option value="">Select a warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name} · {warehouse.location}</option>)}
            </Field>
            <Field label="Requested quantity" name="quantity" type="number" min="1" step="1" placeholder="Whole units" required />
            <Button type="submit" className="w-full" disabled={saving || loading || products.length === 0 || warehouses.length === 0}>
              {saving ? "Submitting…" : "Submit request"} <Send size={14} />
            </Button>
          </form>
        </Card>
        <Card className="h-fit p-5 sm:p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-300/10 text-sky-200"><ShieldCheck size={18} /></span>
          <h2 className="mt-4 text-sm font-semibold">What happens next?</h2>
          <div className="mt-5 space-y-4">
            {[
              ["Submitted", "Your request is added to the shared supply queue."],
              ["Reviewed", "An administrator approves or rejects the quantity."],
              ["Fulfilled", "After approval, coordinate the shipment with the warehouse team."],
            ].map(([title, copy], index) => (
              <div key={title} className="flex gap-3">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${index === 0 ? "bg-orange text-white" : "border border-line bg-card text-muted"}`}>{index + 1}</span>
                <div><p className="text-xs font-medium text-copy">{title}</p><p className="mt-1 text-[10px] leading-5 text-muted">{copy}</p></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

export function SupplierProfilePage() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [image, setImage] = useState({ imageUrl: "", imageFileId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supplierApi.profile()
      .then((response) => {
        setProfile(response.supplier);
        setImage({ imageUrl: response.supplier.image || "", imageFileId: response.supplier.imageFileId || "" });
      })
      .catch((error) => toast.error(getApiError(error)))
      .finally(() => setLoading(false));
  }, []);

  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    setSaving(true);
    try {
      const payload = { name: values.name, phone: values.phone };
      if (image.imageUrl && image.imageFileId) Object.assign(payload, image);
      const response = await supplierApi.updateProfile(payload);
      setProfile(response.supplier);
      setUser({ ...user, ...response.supplier });
      toast.success("Supplier profile updated.");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account settings" title="Supplier profile" description="Keep your contact information and company-facing profile up to date." />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="flex flex-col items-center p-6 text-center">
          {image.imageUrl ? <img src={image.imageUrl} alt="" className="h-24 w-24 rounded-3xl object-cover" /> : <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-orange/10 text-2xl font-semibold text-orange">{user.name?.slice(0, 1).toUpperCase()}</span>}
          <h2 className="mt-4 font-semibold text-copy">{profile?.name || user.name}</h2>
          <p className="mt-1 text-xs text-muted">{profile?.email || user.email}</p>
          <Badge className="mt-4">Supplier account</Badge>
        </Card>
        <Card className="p-5 sm:p-7">
          <h2 className="text-sm font-semibold">Contact information</h2>
          <p className="mt-1 text-[11px] text-muted">Your email is managed by your administrator and cannot be changed here.</p>
          {!loading && (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Field label="Supplier or contact name" name="name" defaultValue={profile?.name || user.name} maxLength={100} required />
              <Field label="Email address" value={profile?.email || user.email} disabled readOnly />
              <Field label="Phone number" name="phone" type="tel" defaultValue={profile?.phone || user.phone || ""} maxLength={30} />
              <ImageUpload currentUrl={image.imageUrl} onChange={setImage} label="Profile image" />
              <div className="flex justify-end border-t border-line pt-4">
                <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
