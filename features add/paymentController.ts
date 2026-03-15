// ============================================================
// backend/src/controllers/paymentController.ts
// Razorpay order creation + verification
// ============================================================
import { Request, Response } from "express";
import crypto from "crypto";
import { razorpay } from "../config/razorpay";
import { db } from "../config/firebase";
import { COLLECTIONS } from "../models/firestoreSchema";
import { sendBookingConfirmation } from "../services/whatsappService";
import { upsertClientRecord } from "./crmRevenueGallery";

// POST /api/payments/create-order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { bookingId, amount } = req.body; // amount in INR

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency: "INR",
      receipt: bookingId,
      notes: { bookingId },
    });

    // Store order ID on booking
    await db.collection(COLLECTIONS.APPOINTMENTS).doc(bookingId).update({
      razorpayOrderId: order.id,
      paymentStatus: "pending",
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments/verify
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingId,
    } = req.body;

    // Verify signature
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "");
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expectedSignature = hmac.digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // Update booking
    const bookingRef = db.collection(COLLECTIONS.APPOINTMENTS).doc(bookingId);
    await bookingRef.update({
      paymentId: razorpay_payment_id,
      paymentStatus: "advance_paid",
      status: "confirmed",
    });

    // Send WhatsApp confirmation
    const bookingDoc = await bookingRef.get();
    const booking = bookingDoc.data()!;

    await sendBookingConfirmation({
      clientName:  booking.clientName,
      clientPhone: booking.clientPhone,
      serviceName: booking.serviceName,
      staffName:   booking.staffName,
      date:        booking.date,
      time:        booking.startTime,
    });

    // Upsert CRM
    await upsertClientRecord(
      booking.clientPhone,
      booking.clientName,
      booking.clientEmail || "",
      booking.advanceAmount,
      booking.date
    );

    res.json({ success: true, bookingId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/payments/webhook — Razorpay webhook (optional)
export const razorpayWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers["x-razorpay-signature"] as string;
    const body = JSON.stringify(req.body);
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "");
    hmac.update(body);
    if (hmac.digest("hex") !== sig) return res.status(400).send("Invalid");

    const event = req.body.event;
    if (event === "payment.captured") {
      const paymentId = req.body.payload.payment.entity.id;
      const bookingId = req.body.payload.payment.entity.receipt;
      await db.collection(COLLECTIONS.APPOINTMENTS).doc(bookingId).update({
        paymentStatus: "advance_paid",
        paymentId,
        status: "confirmed",
      });
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
