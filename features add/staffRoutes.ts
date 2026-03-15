// ============================================================
// backend/src/routes/staffRoutes.ts
// ============================================================
import { Router } from "express";
import {
  getAllStaff, getStaffById, getStaffForService,
  createStaff, updateStaff, deleteStaff,
} from "../controllers/staffController";

const router = Router();
router.get("/",                     getAllStaff);
router.get("/for-service/:serviceId", getStaffForService);
router.get("/:staffId",             getStaffById);
router.post("/",                    createStaff);
router.patch("/:staffId",           updateStaff);
router.delete("/:staffId",          deleteStaff);
export default router;

// ============================================================
// backend/src/routes/slotRoutes.ts
// ============================================================
// import { Router } from "express";
// import { getSlots } from "../controllers/slotController";
// const r = Router();
// r.get("/", getSlots);
// export default r;

// ============================================================
// backend/src/routes/paymentRoutes.ts
// ============================================================
// import { Router } from "express";
// import { createOrder, verifyPayment, razorpayWebhook } from "../controllers/paymentController";
// const r = Router();
// r.post("/create-order", createOrder);
// r.post("/verify",       verifyPayment);
// r.post("/webhook",      razorpayWebhook);
// export default r;

// ============================================================
// backend/src/routes/crmRoutes.ts
// ============================================================
// import { Router } from "express";
// import { getAllClients, getVIPClients } from "../controllers/crmRevenueGallery";
// const r = Router();
// r.get("/clients",     getAllClients);
// r.get("/clients/vip", getVIPClients);
// export default r;
