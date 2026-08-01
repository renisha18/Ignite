// Why this file exists: every service function (auth, and later
// events/attendance/etc.) needs the same base URL, the same
// Authorization header attached automatically, and the same handling
// when a token expires. Centralizing that here means no service file
// ever touches localStorage or headers directly — they just call
// api.post(...) and this file's interceptors do the rest.
//
// Depends on: VITE_API_URL (from .env, read via import.meta.env —
// Vite's env convention, requires the VITE_ prefix to be exposed to
// the client).
// Depended on by: services/authService.js, and every future
// services/*.js file.
import axios from "axios";

const TOKEN_KEY = "ignite_token";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
  headers: { "Content-Type": "application/json" },
});

// Attach the JWT to every outgoing request, if one is stored. Reading
// from localStorage on every request (rather than caching it in a
// variable) means a login/logout in another tab or a manual token
// change takes effect on the very next call, not just after a reload.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Why a registration function instead of importing AuthContext here:
// this file can't import AuthContext (that would be a circular
// dependency — AuthContext uses this file to make requests).
// AuthContext instead calls setUnauthorizedHandler once on mount,
// handing this interceptor a callback to run whenever the backend
// says the token is invalid/expired — same "log the user out" logic
// as a manual logout, triggered automatically.
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export default api;
