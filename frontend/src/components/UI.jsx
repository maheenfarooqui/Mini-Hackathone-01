import { useEffect } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export const cx = (...classes) => classes.filter(Boolean).join(" ");

export function BrandName({ className }) {
  return (
    <span className={cx("brand-name", className)}>
      <span>Manage</span>{" "}
      <span className="brand-name__accent">Your Goods</span>
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  disabled,
  ...props
}) {
  const variants = {
    primary: "bg-orange text-white hover:bg-[#d90043] shadow-[0_8px_24px_rgba(255,0,80,0.2)]",
    secondary: "border border-line bg-card text-copy hover:border-muted/60 hover:bg-slate-100",
    ghost: "text-muted hover:bg-white/5 hover:text-copy",
    danger: "border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20",
  };
  const sizes = {
    sm: "min-h-9 rounded-lg px-3 text-xs",
    md: "min-h-11 rounded-xl px-4 text-sm",
    lg: "min-h-12 rounded-xl px-5 text-sm",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={cx(
        "inline-flex shrink-0 items-center justify-center gap-2 font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ children, className, ...props }) {
  return (
    <section
      className={cx("rounded-2xl border border-line/80 bg-panel/80", className)}
      {...props}
    >
      {children}
    </section>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-orange">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-copy sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  className,
  as = "input",
  children,
  ...props
}) {
  const Element = as;
  return (
    <label className={cx("block space-y-2", className)}>
      {label && <span className="block text-xs font-medium text-muted">{label}</span>}
      <Element
        className="min-h-11 w-full rounded-xl border border-line bg-ink/70 px-3.5 py-2.5 text-sm text-copy outline-none transition placeholder:text-muted/55 focus:border-orange/70 focus:ring-2 focus:ring-orange/15 disabled:opacity-55"
        {...props}
      >
        {children}
      </Element>
      {hint && <span className="block text-[11px] leading-relaxed text-muted/80">{hint}</span>}
    </label>
  );
}

export function Modal({ title, description, onClose, children, size = "max-w-xl" }) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className={cx("my-auto w-full rounded-2xl border border-line bg-panel shadow-2xl", size)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-4 sm:px-6">
          <div>
            <h2 className="font-semibold text-copy">{title}</h2>
            {description && <p className="mt-1 text-xs text-muted">{description}</p>}
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-muted transition hover:bg-white/5 hover:text-copy"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </motion.div>
    </div>
  );
}

const badgeStyles = {
  Pending: "border-amber-400/20 bg-amber-400/10 text-amber-200",
  Processing: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  Completed: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  Approved: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  Rejected: "border-red-400/20 bg-red-400/10 text-red-200",
  Cancelled: "border-muted/20 bg-muted/10 text-muted",
  Active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  "Low stock": "border-orange/25 bg-orange/10 text-orange",
};

export function Badge({ children, className }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold",
        badgeStyles[children] || "border-line bg-card text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DataTable({ columns, rows, loading, emptyTitle = "No records yet", emptyText }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
            {columns.map((column) => (
              <th key={column.key} className={cx("px-5 py-3.5 font-semibold", column.className)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/70">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-16 text-center text-sm text-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange border-r-transparent" />
                  Loading records…
                </span>
              </td>
            </tr>
          ) : rows.length ? (
            rows.map((row, index) => (
              <tr
                key={row._id || row.id || index}
                className="text-sm text-copy transition hover:bg-white/[0.025]"
              >
                {columns.map((column) => (
                  <td key={column.key} className={cx("px-5 py-4", column.cellClassName)}>
                    {column.render ? column.render(row) : row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-5 py-14 text-center">
                <p className="text-sm font-medium text-copy">{emptyTitle}</p>
                {emptyText && <p className="mt-1 text-xs text-muted">{emptyText}</p>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function StatCard({ label, value, note, icon: Icon, tone = "orange" }) {
  const color =
    tone === "green"
      ? "text-emerald-300 bg-emerald-300/10"
      : tone === "blue"
        ? "text-sky-300 bg-sky-300/10"
        : tone === "amber"
          ? "text-amber-200 bg-amber-200/10"
          : "text-orange bg-orange/10";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-copy">{value}</p>
          {note && <p className="mt-1 text-[11px] text-muted">{note}</p>}
        </div>
        {Icon && (
          <div className={cx("rounded-xl p-2.5", color)}>
            <Icon size={18} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function EmptyState({ title, description, action }) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-card text-orange">
        <span className="h-2 w-2 rounded-full bg-orange shadow-[0_0_16px_4px_rgba(255,90,10,0.3)]" />
      </div>
      <h3 className="font-medium text-copy">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted">
      <span className="mr-3 h-4 w-4 animate-spin rounded-full border-2 border-orange border-r-transparent" />
      Loading workspace…
    </div>
  );
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

export function formatCurrency(amount = 0) {
  return `Rs ${Number(amount || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}

export function formatDate(date) {
  if (!date) return "—";
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export function getId(value) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || value.id || "";
}

export function getName(value) {
  if (!value) return "—";
  return typeof value === "string" ? value : value.name || value.email || "—";
}
