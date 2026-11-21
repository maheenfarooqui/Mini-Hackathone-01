import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { activityApi } from "../api/activityApi.js";
import { getApiError } from "../api/axios.js";
import {
  Button,
  Card,
  DataTable,
  Field,
  PageHeader,
} from "../components/UI.jsx";

const entityOptions = ["user", "product", "warehouse", "stock", "order", "supply-request"];
const actionOptions = [
  "login",
  "create",
  "update",
  "delete",
  "stock-in",
  "stock-out",
  "order.process",
  "order.complete",
  "order.cancel",
  "supply-request.review",
];

export default function ActivityLogPage() {
  const [filters, setFilters] = useState({
    user: "",
    entity: "",
    action: "",
    from: "",
    to: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ activities: [], total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries({ ...filters, page }).filter(([, value]) => value !== ""),
      );
      setData(await activityApi.list(params));
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilter(event) {
    setPage(1);
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  const columns = [
    {
      key: "createdAt",
      label: "Time",
      render: (entry) => new Date(entry.createdAt).toLocaleString(),
    },
    {
      key: "user",
      label: "User",
      render: (entry) => (
        <div>
          <p className="font-medium">{entry.user?.name || "Unknown user"}</p>
          <p className="mt-1 text-[10px] text-muted">{entry.user?.email} · {entry.user?.role}</p>
        </div>
      ),
    },
    { key: "action", label: "Action" },
    { key: "entity", label: "Entity" },
    {
      key: "details",
      label: "Details",
      render: (entry) => (
        <span className="block max-w-[320px] truncate text-xs text-muted">
          {Object.entries(entry.details || {})
            .map(([key, value]) => `${key}: ${value}`)
            .join(" · ") || "—"}
        </span>
      ),
    },
    { key: "ip", label: "IP" },
  ];

  const pageCount = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Activity log"
        description="Review account, catalog, stock, order, and supply-request activity."
      />
      <Card className="mb-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="User ID" name="user" value={filters.user} onChange={updateFilter} placeholder="Filter by user ID" />
          <Field label="Entity" as="select" name="entity" value={filters.entity} onChange={updateFilter}>
            <option value="">All entities</option>
            {entityOptions.map((entity) => <option key={entity}>{entity}</option>)}
          </Field>
          <Field label="Action" as="select" name="action" value={filters.action} onChange={updateFilter}>
            <option value="">All actions</option>
            {actionOptions.map((action) => <option key={action}>{action}</option>)}
          </Field>
          <Field label="From" name="from" type="date" value={filters.from} onChange={updateFilter} />
          <Field label="To" name="to" type="date" value={filters.to} onChange={updateFilter} />
        </div>
      </Card>
      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          rows={data.activities}
          loading={loading}
          emptyTitle="No activity found"
          emptyText="Try changing your filters or check again after activity is recorded."
        />
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-xs text-muted">
          <span>{data.total.toLocaleString()} total · Page {page} of {pageCount}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={page >= pageCount || loading} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </>
  );
}
