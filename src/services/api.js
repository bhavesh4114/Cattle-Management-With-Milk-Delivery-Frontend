import axios from "axios";

const API_PREFIX = "/api";

// The base URL must end with exactly one "/api" segment, regardless of how
// VITE_API_URL is written (with/without trailing slash, with/without "/api").
const resolveBaseURL = () => {
  const configured = String(import.meta.env.VITE_API_URL || "")
    .trim()
    .replace(/\/+$/, "");

  return /\/api(\/|$)/i.test(configured)
    ? configured
    : `${configured}${API_PREFIX}`;
};

const api = axios.create({
  baseURL: resolveBaseURL(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("adminToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Safety net: the base URL already carries the "/api" segment, so an
  // endpoint that repeats it would 404 on a doubled prefix. Strip the duplicate.
  const base = String(config.baseURL || "");
  const url = String(config.url || "");

  if (/\/api(\/|$)/i.test(base) && /^\/api(\/|$)/i.test(url)) {
    config.url = url.replace(/^\/api(?=\/|$)/i, "");
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminData");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
