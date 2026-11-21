import { assignedWarehouseIds } from "./warehouseAccess.js";

export function reportWarehouseFilter(user) {
  return user.role === "warehouseManager"
    ? { warehouse: { $in: assignedWarehouseIds(user) } }
    : {};
}

export function parseReportDateRange(query, now = new Date()) {
  const to = query.to ? new Date(query.to) : new Date(now);
  const from = query.from
    ? new Date(query.from)
    : new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: "Valid from and to dates are required." };
  }
  if (query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to)) {
    to.setUTCHours(23, 59, 59, 999);
  }
  if (from > to) return { error: "The from date must be before the to date." };
  return { from, to };
}
