// src/services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "https://backendb.onrender.com/api",
});

// Request interceptor: add access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers["Authorization"] = `Bearer ${token}`;
  return config;
});

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        try {
          const res = await axios.post("https://backendb.onrender.com/api/auth/refresh", { token: refreshToken });
          localStorage.setItem("token", res.data.accessToken);

          // Update header and retry original request
          originalRequest.headers["Authorization"] = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        } catch (err) {
          // Refresh token expired, logout
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.location.href = "/"; // redirect to login
          return Promise.reject(err);
        }
      } else {
        // No refresh token, logout
        localStorage.removeItem("token");
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;