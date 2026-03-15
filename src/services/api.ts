import axios from "axios";

// Provide a mock URL if env is unset
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    console.error("[API Error]", err?.response?.data || err.message);
    return Promise.reject(err);
  }
);

// ── Staff ─────────────────────────────────────────────────────
export const staffService = {
  getAll: () => api.get("/api/staff").then((r) => r.data),
  getForService: (serviceId: string) =>
    api.get(`/api/staff/for-service/${serviceId}`).then((r) => r.data),
  create: (data: any) => api.post("/api/staff", data).then((r) => r.data),
  update: (staffId: string, data: any) =>
    api.patch(`/api/staff/${staffId}`, data).then((r) => r.data),
  remove: (staffId: string) =>
    api.delete(`/api/staff/${staffId}`).then((r) => r.data),
};

// ── Slots ─────────────────────────────────────────────────────
export const slotService = {
  getSlots: (staffId: string, date: string, serviceId: string) =>
    api
      .get("/api/slots", { params: { staffId, date, serviceId } })
      .then((r) => r.data),
};

// ── Payments ──────────────────────────────────────────────────
export const paymentService = {
  createOrder: (bookingId: string, amount: number) =>
    api.post("/api/payments/create-order", { bookingId, amount }).then((r) => r.data),
  verify: (data: any) =>
    api.post("/api/payments/verify", data).then((r) => r.data),
};

// ── CRM ───────────────────────────────────────────────────────
export const crmService = {
  getAll: () => api.get("/api/crm/clients").then((r) => r.data),
  getVIP: () => api.get("/api/crm/clients/vip").then((r) => r.data),
};

// ── Revenue ───────────────────────────────────────────────────
export const revenueService = {
  getStats: () => api.get("/api/revenue/stats").then((r) => r.data),
};

// ── Gallery ───────────────────────────────────────────────────
export const galleryService = {
  getAll: (category?: string) =>
    api.get("/api/gallery", { params: category ? { category } : {} }).then((r) => r.data),
  upload: (formData: FormData) =>
    api.post("/api/gallery", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  remove: (itemId: string) => api.delete(`/api/gallery/${itemId}`).then((r) => r.data),
};
