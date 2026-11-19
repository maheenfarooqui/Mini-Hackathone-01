import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.PROD
    ? ""
    : import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.message =
        "The server could not be reached. Check the API URL and your connection.";
    }
    return Promise.reject(error);
  },
);

export function getApiError(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export default api;
