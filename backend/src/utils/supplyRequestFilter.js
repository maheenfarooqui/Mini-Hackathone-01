export function supplyRequestFilterForUser(user) {
  if (user.role === "supplier") return { supplier: user.id };
  if (user.role === "warehouseManager") {
    return { warehouse: { $in: user.assignedWarehouses || [] } };
  }
  return {};
}
