import api from "./axios.js";

export const dashboardApi = {
  get: () => api.get("/api/dashboard").then((res) => res.data),
};
