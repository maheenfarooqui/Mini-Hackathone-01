export function exactSkuPattern(value) {
  const escaped = value.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped}$`, "i");
}
