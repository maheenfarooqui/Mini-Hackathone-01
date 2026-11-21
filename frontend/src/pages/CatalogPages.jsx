import { useCallback, useEffect, useState } from "react";
import {
  Edit3,
  Mail,
  Package,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import toast from "react-hot-toast";
import { productApi } from "../api/productApi.js";
import { supplierApi } from "../api/supplierApi.js";
import { userApi } from "../api/userApi.js";
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
  formatCurrency,
  getId,
  getName,
  initials,
  Modal,
  PageHeader,
} from "../components/UI.jsx";

const ROLES = [
  ["admin", "Administrator"],
  ["warehouseManager", "Warehouse manager"],
  ["supplier", "Supplier"],
  ["salesRepresentative", "Sales representative"],
];

const emptyProduct = {
  name: "",
  sku: "",
  category: "",
  description: "",
  price: "",
  lowStockLimit: "0",
  supplier: "",
};

function roleLabel(role) {
  return ROLES.find(([value]) => value === role)?.[1] || role || "—";
}

export function ProductsPage() {
  const { user } = useAuth();
  const canEdit = user.role === "admin" || user.role === "warehouseManager";
  const canDelete = user.role === "admin";
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skuQuery, setSkuQuery] = useState("");
  const [skuProduct, setSkuProduct] = useState(null);
  const [skuLoading, setSkuLoading] = useState(false);
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    supplier: "",
    warehouse: "",
    available: "",
    minPrice: "",
    maxPrice: "",
    sort: "-createdAt",
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState({ imageUrl: "", imageFileId: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filters, page }).filter(([, value]) => value !== ""),
      );
      const productData = await productApi.list(params);
      setProducts(productData.products || []);
      setTotal(productData.total ?? productData.count ?? 0);
      setLimit(productData.limit || 20);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    let active = true;
    Promise.all([
      productApi.categories(),
      warehouseApi.list(),
      user.role === "admin" ? supplierApi.list() : Promise.resolve({ suppliers: [] }),
    ])
      .then(([categoryData, warehouseData, supplierData]) => {
        if (!active) return;
        setCategories(categoryData.categories || []);
        setWarehouses(warehouseData.warehouses || []);
        setSuppliers(supplierData.suppliers || []);
      })
      .catch((error) => {
        if (active) toast.error(getApiError(error));
      });
    return () => { active = false; };
  }, [user.role]);

  function updateFilter(event) {
    setPage(1);
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function searchSku(event) {
    event.preventDefault();
    const sku = skuQuery.trim();
    if (!sku) return;
    setSkuLoading(true);
    setSkuProduct(null);
    try {
      const response = await productApi.bySku(sku);
      setSkuProduct(response.product);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSkuLoading(false);
    }
  }

  function openForm(product = null) {
    setModal(product ? { ...product } : { ...emptyProduct });
    setImage({
      imageUrl: product?.imageUrl || "",
      imageFileId: product?.imageFileId || "",
    });
  }

  async function saveProduct(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = {
      ...values,
      price: Number(values.price),
      lowStockLimit: Number(values.lowStockLimit),
      supplier: values.supplier || null,
    };
    if (image.imageUrl && image.imageFileId) Object.assign(payload, image);
    if (!modal._id && (!image.imageUrl || !image.imageFileId)) {
      toast.error("Upload a product image before creating the product.");
      return;
    }
    setSaving(true);
    try {
      if (modal._id) {
        await productApi.update(modal._id, payload);
        toast.success("Product updated.");
      } else {
        await productApi.create(payload);
        toast.success("Product added.");
      }
      setModal(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete ${product.name}?`)) return;
    try {
      await productApi.remove(product._id);
      toast.success("Product deleted.");
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  const columns = [
    {
      key: "name",
      label: "Product",
      render: (product) => (
        <div className="flex items-center gap-3">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-card text-orange"><Package size={16} /></span>
          )}
          <div className="min-w-0">
            <p className="max-w-[200px] truncate font-medium text-copy">{product.name}</p>
            <p className="mt-1 text-[10px] text-muted">{product.sku}</p>
          </div>
        </div>
      ),
    },
    { key: "category", label: "Category" },
    { key: "price", label: "Price", render: (product) => formatCurrency(product.price) },
    {
      key: "quantity",
      label: "Stock on hand",
      render: (product) =>
        product.quantity === undefined ? "—" : (
          <span className={product.quantity <= product.lowStockLimit ? "text-amber-200" : "text-copy"}>
            {product.quantity}
          </span>
        ),
    },
    {
      key: "supplier",
      label: "Supplier",
      render: (product) => getName(product.supplier),
    },
    ...(canEdit
      ? [{
          key: "actions",
          label: "",
          className: canDelete ? "w-24" : "w-12",
          render: (product) => (
            <div className="flex justify-end gap-1">
              <button onClick={() => openForm(product)} className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-copy" aria-label={`Edit ${product.name}`}><Edit3 size={14} /></button>
              {canDelete && <button onClick={() => deleteProduct(product)} className="rounded-lg p-2 text-muted hover:bg-red-400/10 hover:text-red-300" aria-label={`Delete ${product.name}`}><Trash2 size={14} /></button>}
            </div>
          ),
        }]
      : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Catalog"
        title={user.role === "supplier" ? "My products" : "Products"}
        description={user.role === "supplier" ? "Products associated with your supplier account." : "Manage your product catalog and keep stock levels in view."}
        actions={canEdit && <Button onClick={() => openForm()}><Plus size={15} /> Add product</Button>}
      />
      {user.role === "salesRepresentative" && (
        <Card className="mb-4 p-4 sm:p-5">
          <form onSubmit={searchSku} className="flex flex-col gap-3 sm:flex-row">
            <Field
              label="Barcode / SKU lookup"
              name="sku"
              value={skuQuery}
              onChange={(event) => setSkuQuery(event.target.value)}
              placeholder="Scan or enter an exact SKU, then press Enter"
              className="flex-1"
            />
            <Button type="submit" disabled={skuLoading || !skuQuery.trim()} className="self-end">
              {skuLoading ? "Searching…" : "Find SKU"}
            </Button>
          </form>
          {skuProduct && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
              <div className="flex items-center gap-3">
                {skuProduct.imageUrl && <img src={skuProduct.imageUrl} alt="" className="h-12 w-12 object-cover" />}
                <div>
                  <p className="font-semibold">{skuProduct.name}</p>
                  <p className="mt-1 text-xs text-muted">{skuProduct.sku} · {skuProduct.category}</p>
                </div>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(skuProduct.price)}</p>
              <p className="text-sm">Available: <span className="font-semibold">{skuProduct.quantity}</span></p>
            </div>
          )}
        </Card>
      )}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-semibold text-copy">Product catalog</p>
            <p className="mt-1 text-[11px] text-muted">{total} products found</p>
          </div>
        </div>
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <label className="relative block">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              name="q"
              value={filters.q}
              onChange={updateFilter}
              placeholder="Search name, SKU…"
              className="h-11 w-full border border-line bg-ink/60 pl-9 pr-3 text-xs text-copy outline-none placeholder:text-muted/60 focus:border-orange/60"
            />
          </label>
          <Field as="select" aria-label="Filter by category" name="category" value={filters.category} onChange={updateFilter}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category}>{category}</option>)}
          </Field>
          {user.role === "admin" ? (
            <Field as="select" aria-label="Filter by supplier" name="supplier" value={filters.supplier} onChange={updateFilter}>
              <option value="">All suppliers</option>
              {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
            </Field>
          ) : user.role !== "supplier" ? (
            <Field aria-label="Filter by supplier ID" name="supplier" value={filters.supplier} onChange={updateFilter} placeholder="Supplier ID" />
          ) : null}
          <Field as="select" aria-label="Filter by warehouse" name="warehouse" value={filters.warehouse} onChange={updateFilter}>
            <option value="">All warehouses</option>
            {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
          </Field>
          <Field as="select" aria-label="Filter by availability" name="available" value={filters.available} onChange={updateFilter}>
            <option value="">Any availability</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </Field>
          <Field aria-label="Minimum price" name="minPrice" type="number" min="0" value={filters.minPrice} onChange={updateFilter} placeholder="Min price" />
          <Field aria-label="Maximum price" name="maxPrice" type="number" min="0" value={filters.maxPrice} onChange={updateFilter} placeholder="Max price" />
          <Field as="select" aria-label="Sort products" name="sort" value={filters.sort} onChange={updateFilter}>
            <option value="-createdAt">Newest</option>
            <option value="price">Price: low to high</option>
            <option value="-price">Price: high to low</option>
            <option value="name">Name</option>
          </Field>
        </div>
        <DataTable
          columns={columns}
          rows={products}
          loading={loading}
          emptyTitle="No products found"
          emptyText={filters.q ? "Try a different search term." : "Products added to the catalog will appear here."}
        />
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
          <span>{total.toLocaleString()} total · Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= Math.max(1, Math.ceil(total / limit)) || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      {modal && (
        <Modal
          title={modal._id ? "Edit product" : "Add product"}
          description="Product details are shared across your inventory and orders."
          onClose={() => setModal(null)}
        >
          <form onSubmit={saveProduct} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" name="name" defaultValue={modal.name} required maxLength={120} />
              <Field label="SKU" name="sku" defaultValue={modal.sku} required maxLength={60} />
              <Field label="Category" name="category" defaultValue={modal.category} required maxLength={80} />
              <Field label="Unit price (Rs)" name="price" type="number" min="0" step="0.01" defaultValue={modal.price} required />
              <Field label="Low-stock threshold" name="lowStockLimit" type="number" min="0" step="1" defaultValue={modal.lowStockLimit ?? 0} required />
              <Field label="Supplier (optional)" as="select" name="supplier" defaultValue={getId(modal.supplier)}>
                <option value="">No supplier assigned</option>
                {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name} · {supplier.email}</option>)}
              </Field>
            </div>
            <Field label="Description" name="description" as="textarea" rows={3} defaultValue={modal.description} maxLength={2000} />
            <ImageUpload currentUrl={image.imageUrl} onChange={setImage} label="Product image" />
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving || (!modal._id && (!image.imageUrl || !image.imageFileId))}>
                {saving ? "Saving…" : modal._id ? "Save changes" : "Add product"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [role, setRole] = useState("salesRepresentative");
  const [assignedWarehouses, setAssignedWarehouses] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [userData, warehouseData] = await Promise.all([userApi.list(), warehouseApi.list()]);
      setUsers(userData.users || []);
      setWarehouses(warehouseData.warehouses || []);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm(person = null) {
    setModal(person || { name: "", email: "", phone: "", role: "salesRepresentative" });
    setRole(person?.role || "salesRepresentative");
    setAssignedWarehouses((person?.assignedWarehouses || []).map(getId));
  }

  async function saveUser(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = {
      ...values,
      role,
      ...(role === "warehouseManager" ? { assignedWarehouses } : {}),
    };
    if (modal._id && !payload.password) delete payload.password;
    setSaving(true);
    try {
      if (modal._id) {
        await userApi.update(modal._id, payload);
        toast.success("User updated.");
      } else {
        const result = await userApi.create(payload);
        const newUserId = result.user?._id || result.user?.id;
        if (role === "warehouseManager" && assignedWarehouses.length && newUserId) {
          await userApi.update(newUserId, { role, assignedWarehouses });
        }
        toast.success("User created.");
      }
      setModal(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(person) {
    if (!window.confirm(`Delete access for ${person.name}?`)) return;
    try {
      await userApi.remove(person._id);
      toast.success("User removed.");
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  const columns = [
    {
      key: "name",
      label: "Team member",
      render: (person) => (
        <div className="flex items-center gap-3">
          {person.image ? <img src={person.image} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange/10 text-[10px] font-bold text-orange">{initials(person.name)}</span>}
          <div><p className="font-medium text-copy">{person.name}</p><p className="mt-1 text-[10px] text-muted">{person.email}</p></div>
        </div>
      ),
    },
    { key: "role", label: "Role", render: (person) => <Badge>{roleLabel(person.role)}</Badge> },
    { key: "phone", label: "Phone" },
    {
      key: "assignedWarehouses",
      label: "Assigned warehouses",
      render: (person) => person.role === "warehouseManager" ? (person.assignedWarehouses || []).map(getName).join(", ") || "Not assigned" : "—",
    },
    {
      key: "actions",
      label: "",
      className: "w-20",
      render: (person) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openForm(person)} className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-copy" aria-label={`Edit ${person.name}`}><Edit3 size={14} /></button>
          <button onClick={() => deleteUser(person)} className="rounded-lg p-2 text-muted hover:bg-red-400/10 hover:text-red-300" aria-label={`Delete ${person.name}`}><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="People & permissions"
        title="Team & access"
        description="Manage accounts, assign roles and connect managers to their warehouses."
        actions={<Button onClick={() => openForm()}><UserPlus size={15} /> Add team member</Button>}
      />
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <p className="text-sm font-semibold text-copy">People</p>
          <p className="mt-1 text-[11px] text-muted">{users.length} accounts</p>
        </div>
        <DataTable columns={columns} rows={users} loading={loading} emptyTitle="No team members" emptyText="Create an account to invite a teammate." />
      </Card>

      {modal && (
        <Modal title={modal._id ? "Edit team member" : "Add team member"} description="Assign the right role and warehouse access." onClose={() => setModal(null)}>
          <form onSubmit={saveUser} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" name="name" defaultValue={modal.name} required maxLength={100} />
              <Field label="Email address" name="email" type="email" defaultValue={modal.email} required />
              <Field label="Phone" name="phone" type="tel" defaultValue={modal.phone} maxLength={30} />
              <Field label="Role" as="select" value={role} onChange={(event) => { setRole(event.target.value); setAssignedWarehouses([]); }} required>
                {ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </Field>
              {!modal._id && <Field label="Temporary password" name="password" type="password" minLength={8} required hint="At least 8 characters." />}
              {modal._id && <Field label="New password (optional)" name="password" type="password" minLength={8} hint="Leave blank to keep the current password." />}
            </div>
            {role === "warehouseManager" && (
              <Field
                label="Assigned warehouses"
                as="select"
                multiple
                value={assignedWarehouses}
                onChange={(event) => setAssignedWarehouses(Array.from(event.target.selectedOptions, (option) => option.value))}
                className="min-h-28"
                hint="Use Ctrl (Windows) or Command (Mac) to select multiple warehouses."
              >
                {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name} · {warehouse.location}</option>)}
              </Field>
            )}
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : modal._id ? "Save changes" : "Create account"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function WarehousesPage() {
  const { user } = useAuth();
  const canManage = user.role === "admin";
  const [warehouses, setWarehouses] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [warehouseData, userData] = await Promise.all([
        warehouseApi.list(),
        canManage ? userApi.list({ role: "warehouseManager" }) : Promise.resolve({ users: [] }),
      ]);
      setWarehouses(warehouseData.warehouses || []);
      setManagers(userData.users || []);
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  useEffect(() => { load(); }, [load]);

  function openForm(warehouse = null) {
    setModal(warehouse || { name: "", location: "", capacity: 0, manager: "" });
  }

  async function saveWarehouse(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = { ...values, capacity: Number(values.capacity), manager: values.manager || null };
    setSaving(true);
    try {
      if (modal._id) {
        await warehouseApi.update(modal._id, payload);
        toast.success("Warehouse updated.");
      } else {
        await warehouseApi.create(payload);
        toast.success("Warehouse created.");
      }
      setModal(null);
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function deleteWarehouse(warehouse) {
    if (!window.confirm(`Delete ${warehouse.name}?`)) return;
    try {
      await warehouseApi.remove(warehouse._id);
      toast.success("Warehouse deleted.");
      await load();
    } catch (error) {
      toast.error(getApiError(error));
    }
  }

  const columns = [
    {
      key: "name",
      label: "Warehouse",
      render: (warehouse) => <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-orange"><WarehouseIcon size={17} /></span><div><p className="font-medium">{warehouse.name}</p><p className="mt-1 text-[10px] text-muted">{warehouse.location}</p></div></div>,
    },
    { key: "capacity", label: "Capacity", render: (warehouse) => warehouse.capacity ? `${warehouse.capacity.toLocaleString()} units` : "Not set" },
    { key: "manager", label: "Manager", render: (warehouse) => getName(warehouse.manager) },
    ...(canManage ? [{
      key: "actions",
      label: "",
      className: "w-20",
      render: (warehouse) => <div className="flex justify-end gap-1"><button onClick={() => openForm(warehouse)} className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-copy" aria-label={`Edit ${warehouse.name}`}><Edit3 size={14} /></button><button onClick={() => deleteWarehouse(warehouse)} className="rounded-lg p-2 text-muted hover:bg-red-400/10 hover:text-red-300" aria-label={`Delete ${warehouse.name}`}><Trash2 size={14} /></button></div>,
    }] : []),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Locations"
        title="Warehouses"
        description="Keep warehouse locations and manager assignments up to date."
        actions={canManage && <Button onClick={() => openForm()}><Plus size={15} /> Add warehouse</Button>}
      />
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <p className="text-sm font-semibold text-copy">Warehouse network</p>
          <p className="mt-1 text-[11px] text-muted">{warehouses.length} locations</p>
        </div>
        <DataTable columns={columns} rows={warehouses} loading={loading} emptyTitle="No warehouses yet" emptyText="Warehouse locations will appear here once they are added." />
      </Card>
      {modal && canManage && (
        <Modal title={modal._id ? "Edit warehouse" : "Add warehouse"} description="Set a location, capacity and manager." onClose={() => setModal(null)}>
          <form onSubmit={saveWarehouse} className="space-y-4">
            <Field label="Warehouse name" name="name" defaultValue={modal.name} required maxLength={100} />
            <Field label="Location" name="location" defaultValue={modal.location} required maxLength={200} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Capacity (units)" name="capacity" type="number" min="0" step="1" defaultValue={modal.capacity ?? 0} required />
              <Field label="Manager" as="select" name="manager" defaultValue={getId(modal.manager)}>
                <option value="">Unassigned</option>
                {managers.map((manager) => <option key={manager._id} value={manager._id}>{manager.name}</option>)}
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : modal._id ? "Save changes" : "Create warehouse"}</Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supplierApi.list()
      .then((response) => setSuppliers(response.suppliers || []))
      .catch((error) => toast.error(getApiError(error)))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: "name",
      label: "Supplier",
      render: (supplier) => <div className="flex items-center gap-3">{supplier.image ? <img src={supplier.image} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 text-[10px] font-bold text-orange">{initials(supplier.name)}</span>}<div><p className="font-medium">{supplier.name}</p><p className="mt-1 text-[10px] text-muted">Added {new Date(supplier.createdAt).toLocaleDateString()}</p></div></div>,
    },
    { key: "email", label: "Email", render: (supplier) => <a href={`mailto:${supplier.email}`} className="inline-flex items-center gap-2 text-muted hover:text-orange"><Mail size={13} />{supplier.email}</a> },
    { key: "phone", label: "Phone" },
  ];

  return (
    <>
      <PageHeader eyebrow="Partners" title="Suppliers" description="Your supplier accounts and the products they provide." />
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <p className="text-sm font-semibold text-copy">Supply partners</p>
          <p className="mt-1 text-[11px] text-muted">{suppliers.length} registered suppliers</p>
        </div>
        <DataTable columns={columns} rows={suppliers} loading={loading} emptyTitle="No suppliers registered" emptyText="Create a supplier account from Team & access to connect a partner." />
      </Card>
    </>
  );
}
