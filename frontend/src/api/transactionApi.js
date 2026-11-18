import api from "./axios.js";

export const transactionApi = {
  list: (params) =>
    api.get("/api/transactions", { params }).then((res) => res.data),
};
