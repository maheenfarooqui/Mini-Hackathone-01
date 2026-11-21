import api from "./axios.js";

export const reportApi = {
  monthlySales: (params) => api.get("/api/reports/sales-monthly", { params }).then((res) => res.data),
  stockMovement: (params) => api.get("/api/reports/stock-movement", { params }).then((res) => res.data),
  topProducts: (params) => api.get("/api/reports/top-products", { params }).then((res) => res.data),
};
