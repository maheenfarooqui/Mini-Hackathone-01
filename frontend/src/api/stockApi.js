import api from "./axios.js";

export const stockApi = {
  list: (params) => api.get("/api/stock", { params }).then((res) => res.data),
  low: (params) =>
    api.get("/api/stock/low", { params }).then((res) => res.data),
  add: (data) => api.post("/api/stock/in", data).then((res) => res.data),
  remove: (data) => api.post("/api/stock/out", data).then((res) => res.data),
};
