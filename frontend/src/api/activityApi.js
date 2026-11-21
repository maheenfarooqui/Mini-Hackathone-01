import api from "./axios.js";

export const activityApi = {
  list: (params) => api.get("/api/activity", { params }).then((res) => res.data),
};
