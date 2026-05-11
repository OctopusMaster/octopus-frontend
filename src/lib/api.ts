import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post("/api/auth/login", { email, password }).then((r) => r.data);

// ── Sensors ───────────────────────────────────────────────────────────────────
export const getSensors = () =>
  api.get("/api/sensors").then((r) => r.data);

export const getSensor = (id: string) =>
  api.get(`/api/sensors/${id}`).then((r) => r.data);

export const createSensor = (data: {
  name: string;
  type: string;
  location: string;
  unit: string;
  min_normal: number;
  max_normal: number;
  sample_rate_hz: number;
  rack_id?: string;
  rack_unit?: number;
}) => api.post("/api/sensors", data).then((r) => r.data);

export const getSensorReadings = (
  id: string,
  from?: string,
  to?: string
) => {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  return api.get(`/api/sensors/${id}/readings`, { params }).then((r) => r.data);
};

// ── Responsible persons ───────────────────────────────────────────────────────
export const getResponsiblePersons = () =>
  api.get("/api/responsible-persons").then((r) => r.data);

export const assignSensorPerson = (
  sensorId: string,
  person: { name: string; email: string; phone: string }
) => api.post(`/api/sensors/${sensorId}/assignments`, person).then((r) => r.data);

export const getSensorAssignments = (sensorId: string) =>
  api.get(`/api/sensors/${sensorId}/assignments`).then((r) => r.data);

// ── Alerts ────────────────────────────────────────────────────────────────────
export const getAlerts = (params?: { status?: string; severity?: string }) =>
  api.get("/api/alerts", { params }).then((r) => r.data);

export const acknowledgeAlert = (id: string) =>
  api.post(`/api/alerts/${id}/acknowledge`).then((r) => r.data);

export const resolveAlert = (id: string) =>
  api.post(`/api/alerts/${id}/resolve`).then((r) => r.data);
