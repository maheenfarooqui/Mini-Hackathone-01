import api from "./axios.js";

export const productApi = {
  list: (params) => api.get("/api/products", { params }).then((res) => res.data),
  categories: () => api.get("/api/products/categories").then((res) => res.data),
  bySku: (sku) => api.get(`/api/products/sku/${encodeURIComponent(sku)}`).then((res) => res.data),
  get: (id) => api.get(`/api/products/${id}`).then((res) => res.data),
  create: (data) => api.post("/api/products", data).then((res) => res.data),
  update: (id, data) =>
    api.put(`/api/products/${id}`, data).then((res) => res.data),
  remove: (id) => api.delete(`/api/products/${id}`).then((res) => res.data),
};
