import api from "./axios.js";

export const authApi = {
  register: (data) => api.post("/api/auth/register", data).then((res) => res.data),
  login: (data) => api.post("/api/auth/login", data).then((res) => res.data),
  me: () => api.get("/api/auth/me").then((res) => res.data),
  logout: () => api.post("/api/auth/logout").then((res) => res.data),
};
