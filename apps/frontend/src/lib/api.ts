import axios from "axios";
import { clearSession, getAccessToken, setSession } from "./auth";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001",
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing = false;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !refreshing) {
      originalRequest._retry = true;
      refreshing = true;
      try {
        const refresh = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        if (refresh.data?.accessToken && refresh.data?.user) {
          setSession(refresh.data.accessToken, refresh.data.user);
          originalRequest.headers.Authorization = `Bearer ${refresh.data.accessToken}`;
          return api(originalRequest);
        }
      } catch {
        clearSession();
      } finally {
        refreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export { api };
