import api from "./axios.js";

export const supplierApi = {
  list: () => api.get("/api/suppliers").then((res) => res.data),
  profile: () => api.get("/api/suppliers/me").then((res) => res.data),
  updateProfile: (data) =>
    api.patch("/api/suppliers/me", data).then((res) => res.data),
  requests: (params) =>
    api.get("/api/supply-requests", { params }).then((res) => res.data),
  createRequest: (data) =>
    api.post("/api/supply-requests", data).then((res) => res.data),
  reviewRequest: (id, status, reviewNote = "") =>
    api
      .patch(`/api/supply-requests/${id}/review`, { status, reviewNote })
      .then((res) => res.data),
};
