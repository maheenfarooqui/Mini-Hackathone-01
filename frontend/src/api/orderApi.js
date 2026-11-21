import api from "./axios.js";

export const orderApi = {
  list: (params) => api.get("/api/orders", { params }).then((res) => res.data),
  get: (id) => api.get(`/api/orders/${id}`).then((res) => res.data),
  invoice: (id) =>
    api.get(`/api/orders/${id}/invoice`, { responseType: "blob" }).then((res) => res.data),
  create: (data) => api.post("/api/orders", data).then((res) => res.data),
  updateStatus: (id, status) =>
    api.patch(`/api/orders/${id}/status`, { status }).then((res) => res.data),
  cancel: (id) =>
    api.patch(`/api/orders/${id}/cancel`).then((res) => res.data),
};
