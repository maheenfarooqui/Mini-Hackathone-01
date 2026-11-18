import api from "./axios.js";

export const warehouseApi = {
  list: () => api.get("/api/warehouses").then((res) => res.data),
  get: (id) => api.get(`/api/warehouses/${id}`).then((res) => res.data),
  create: (data) => api.post("/api/warehouses", data).then((res) => res.data),
  update: (id, data) =>
    api.put(`/api/warehouses/${id}`, data).then((res) => res.data),
  remove: (id) => api.delete(`/api/warehouses/${id}`).then((res) => res.data),
};
