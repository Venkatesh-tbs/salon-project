// ============================================================
// backend/src/index.ts  ← MODIFIED FILE
// Add these imports and route registrations to your existing
// index.ts WITHOUT removing existing routes.
// ============================================================
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

// ── Existing imports (keep yours) ────────────────────────────
// import existingRouter from "./routes/existingRoutes";

// ── NEW imports ───────────────────────────────────────────────
import staffRoutes    from "./routes/staffRoutes";
import { getSlots }   from "./controllers/slotController";
import { createOrder, verifyPayment, razorpayWebhook } from "./controllers/paymentController";
import { getAllClients, getVIPClients } from "./controllers/crmRevenueGallery";
import { getRevenueStats } from "./controllers/crmRevenueGallery";
import {
  getGallery, uploadGalleryItem, deleteGalleryItem, uploadMiddleware,
} from "./controllers/crmRevenueGallery";
import { startReminderCron } from "./services/reminderService";

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));

// Razorpay webhook needs raw body — register BEFORE express.json()
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), razorpayWebhook);

app.use(express.json());

// ── Existing routes (keep yours) ─────────────────────────────
// app.use("/api/bookings", existingRouter);

// ── NEW routes ────────────────────────────────────────────────
app.use("/api/staff",    staffRoutes);

// Slots
app.get("/api/slots",    getSlots);

// Payments
app.post("/api/payments/create-order", createOrder);
app.post("/api/payments/verify",       verifyPayment);

// CRM
app.get("/api/crm/clients",     getAllClients);
app.get("/api/crm/clients/vip", getVIPClients);

// Revenue
app.get("/api/revenue/stats", getRevenueStats);

// Gallery
app.get("/api/gallery",                                        getGallery);
app.post("/api/gallery",     uploadMiddleware,                 uploadGalleryItem);
app.delete("/api/gallery/:itemId",                             deleteGalleryItem);

// ── Start reminder cron ───────────────────────────────────────
startReminderCron();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[Server] Running on port ${PORT}`));

export default app;
