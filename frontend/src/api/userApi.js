import api from "./axios.js";

export const userApi = {
  list: (params) => api.get("/api/users", { params }).then((res) => res.data),
  create: (data) => api.post("/api/users", data).then((res) => res.data),
  update: (id, data) =>
    api.put(`/api/users/${id}`, data).then((res) => res.data),
  remove: (id) => api.delete(`/api/users/${id}`).then((res) => res.data),
  updateProfile: (data) =>
    api.patch("/api/users/me/profile", data).then((res) => res.data),
};
