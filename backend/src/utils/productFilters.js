import mongoose from "mongoose";

const sorts = {
  price: { price: 1 },
  "-price": { price: -1 },
  name: { name: 1 },
  "-createdAt": { createdAt: -1 },
};

function priceFromQuery(value, label) {
  if (value === undefined) return { value: undefined };
  if (value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
    return { error: `${label} must be a non-negative number.` };
  }
  return { value: Number(value) };
}

export function parseProductListOptions(query, user) {
  const filter = { sku: { $exists: true } };
  if (user.role === "supplier") filter.supplier = user.id;
  if (query.category) filter.category = String(query.category);
  if (query.supplier) {
    if (!mongoose.isValidObjectId(query.supplier)) {
      return { error: "Invalid supplier ID.", status: 400 };
    }
    if (user.role !== "supplier") filter.supplier = query.supplier;
  }
  if (query.q) {
    const search = String(query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
    ];
  }

  const minPrice = priceFromQuery(query.minPrice, "Minimum price");
  if (minPrice.error) return { error: minPrice.error, status: 400 };
  const maxPrice = priceFromQuery(query.maxPrice, "Maximum price");
  if (maxPrice.error) return { error: maxPrice.error, status: 400 };
  if (
    minPrice.value !== undefined &&
    maxPrice.value !== undefined &&
    minPrice.value > maxPrice.value
  ) {
    return { error: "Minimum price cannot exceed maximum price.", status: 400 };
  }
  if (minPrice.value !== undefined || maxPrice.value !== undefined) {
    filter.price = {};
    if (minPrice.value !== undefined) filter.price.$gte = minPrice.value;
    if (maxPrice.value !== undefined) filter.price.$lte = maxPrice.value;
  }

  if (query.available !== undefined && !["true", "false"].includes(query.available)) {
    return { error: "Availability must be true or false.", status: 400 };
  }
  if (query.sort && !sorts[query.sort]) {
    return { error: "Invalid product sort order.", status: 400 };
  }

  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  return {
    filter,
    available: query.available,
    sort: sorts[query.sort] || { createdAt: -1 },
    page,
    limit,
    skip: (page - 1) * limit,
  };
}
