// ============================================================
// frontend/src/components/booking/PaymentModal.tsx
// Razorpay checkout modal
// ============================================================
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { paymentService } from "../../services/api";
import type { Appointment } from "../../types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Props {
  isOpen: boolean;
  booking: Partial<Appointment> | null;
  onSuccess: (paymentId: string) => void;
  onClose: () => void;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const PaymentModal: React.FC<Props> = ({ isOpen, booking, onSuccess, onClose }) => {
  const [step, setStep] = useState<"review" | "paying" | "success" | "error">("review");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) setStep("review");
  }, [isOpen]);

  const handlePay = async () => {
    if (!booking?.bookingId || !booking.advanceAmount) return;
    setStep("paying");

    const loaded = await loadRazorpayScript();
    if (!loaded) { setError("Payment service unavailable"); setStep("error"); return; }

    try {
      const order = await paymentService.createOrder(booking.bookingId, booking.advanceAmount);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Salon Luxé",
        description: booking.serviceName || "Appointment Booking",
        order_id: order.orderId,
        prefill: {
          name:    booking.clientName,
          contact: booking.clientPhone,
          email:   booking.clientEmail,
        },
        theme: { color: "#c026d3" },
        handler: async (response: any) => {
          await paymentService.verify({
            razorpay_order_id:   response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature:  response.razorpay_signature,
            bookingId: booking.bookingId,
          });
          setStep("success");
          onSuccess(response.razorpay_payment_id);
        },
        modal: { ondismiss: () => setStep("review") },
      };

      new window.Razorpay(options).open();
    } catch (e: any) {
      setError(e?.response?.data?.error || "Payment failed");
      setStep("error");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && booking && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #0f0a1e 0%, #1a0d2e 100%)",
              boxShadow: "0 0 80px #7c3aed22, 0 40px 80px rgba(0,0,0,0.6)",
            }}
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {/* Header gradient bar */}
            <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, #c026d3, #7c3aed, #6366f1)" }} />

            <div className="p-8">
              <AnimatePresence mode="wait">

                {/* Review step */}
                {step === "review" && (
                  <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <h3 className="text-xl font-black text-white mb-1" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Confirm & Pay
                    </h3>
                    <p className="text-white/40 text-sm mb-6">Pay advance to secure your slot</p>

                    {/* Booking summary */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-6 space-y-3">
                      {[
                        { label: "Service",  value: booking.serviceName },
                        { label: "Stylist",  value: booking.staffName },
                        { label: "Date",     value: booking.date },
                        { label: "Time",     value: booking.startTime },
                        { label: "Duration", value: `${booking.serviceDuration} min` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-white/40">{label}</span>
                          <span className="text-white font-medium">{value}</span>
                        </div>
                      ))}
                      <div className="border-t border-white/[0.07] pt-3 flex justify-between">
                        <span className="text-white/40 text-sm">Total Price</span>
                        <span className="text-white font-bold">₹{booking.totalAmount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-fuchsia-400 text-sm font-semibold">Advance to Pay</span>
                        <span className="text-fuchsia-400 font-black text-lg">₹{booking.advanceAmount}</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handlePay}
                        className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{
                          background: "linear-gradient(135deg, #c026d3, #7c3aed)",
                          boxShadow: "0 0 25px #c026d333",
                        }}
                      >
                        Pay ₹{booking.advanceAmount} →
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Paying step */}
                {step === "paying" && (
                  <motion.div key="paying" className="text-center py-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="w-16 h-16 rounded-full border-2 border-fuchsia-500/30 border-t-fuchsia-500 animate-spin mx-auto mb-4" />
                    <p className="text-white font-semibold">Opening payment gateway…</p>
                    <p className="text-white/40 text-sm mt-1">Please don't close this window</p>
                  </motion.div>
                )}

                {/* Success step */}
                {step === "success" && (
                  <motion.div key="success" className="text-center py-6" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <motion.div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4"
                      style={{ background: "linear-gradient(135deg, #059669, #065f46)" }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      ✓
                    </motion.div>
                    <h3 className="text-xl font-black text-white mb-2" style={{ fontFamily: "'Syne', sans-serif" }}>
                      Booking Confirmed!
                    </h3>
                    <p className="text-white/50 text-sm mb-1">You'll receive a WhatsApp confirmation shortly.</p>
                    <p className="text-fuchsia-400 text-sm">See you at Salon Luxé ✂️</p>
                    <button
                      onClick={onClose}
                      className="mt-6 px-8 py-3 rounded-xl font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)" }}
                    >
                      Done
                    </button>
                  </motion.div>
                )}

                {/* Error step */}
                {step === "error" && (
                  <motion.div key="error" className="text-center py-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="text-5xl mb-4">⚠️</div>
                    <h3 className="text-lg font-bold text-white mb-2">Payment Failed</h3>
                    <p className="text-white/40 text-sm mb-6">{error}</p>
                    <div className="flex gap-3">
                      <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm">
                        Cancel
                      </button>
                      <button
                        onClick={() => setStep("review")}
                        className="flex-1 py-3 rounded-xl font-bold text-white text-sm"
                        style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)" }}
                      >
                        Try Again
                      </button>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
