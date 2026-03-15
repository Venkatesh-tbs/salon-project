// ============================================================
// frontend/src/pages/BookingPage.tsx   ← MODIFIED
// Adds: StaffPicker, SlotPicker, PaymentModal
// Keep all existing form fields — only extend, don't remove
// ============================================================
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { staffService, slotService } from "../services/api";
import { StaffPicker } from "../components/booking/StaffPicker";
import { SlotPicker } from "../components/booking/SlotPicker";
import { PaymentModal } from "../components/booking/PaymentModal";
import type { StaffMember, TimeSlot, SalonService, Appointment } from "../types";
import { v4 as uuid } from "uuid";

// ── Replace with your existing services list or fetch from API ──
const SERVICES: SalonService[] = [
  { serviceId: "svc_001", name: "Precision Cut",    duration: 45,  price: 599,  advanceAmount: 100, category: "haircut", icon: "✂️", description: "Expert sculpting" },
  { serviceId: "svc_002", name: "Color & Balayage", duration: 120, price: 2499, advanceAmount: 500, category: "color",   icon: "🎨", description: "Dimensional color" },
  { serviceId: "svc_003", name: "Luxury Facial",    duration: 60,  price: 1299, advanceAmount: 200, category: "facial",  icon: "💆", description: "Radiant skin ritual" },
  { serviceId: "svc_004", name: "Nail Art Studio",  duration: 50,  price: 799,  advanceAmount: 100, category: "nails",   icon: "💅", description: "Bespoke nail art" },
  { serviceId: "svc_005", name: "Keratin Therapy",  duration: 180, price: 3499, advanceAmount: 700, category: "keratin", icon: "🌿", description: "Frizz-free lasting" },
  { serviceId: "svc_006", name: "Bridal Package",   duration: 480, price: 9999, advanceAmount: 2000,category: "bridal",  icon: "👑", description: "Complete bridal look" },
  { serviceId: "svc_007", name: "Scalp Ritual",     duration: 40,  price: 899,  advanceAmount: 0,   category: "scalp",   icon: "🧖", description: "Deep nourishment" },
  { serviceId: "svc_008", name: "Blowout & Style",  duration: 30,  price: 499,  advanceAmount: 0,   category: "blowout", icon: "🔥", description: "Salon-finish volume" },
];

const STEPS = ["Service", "Stylist", "Date & Time", "Details", "Payment"];

type Step = 0 | 1 | 2 | 3 | 4;

interface FormState {
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  notes: string;
}

const INITIAL_FORM: FormState = {
  serviceId: "", staffId: "", date: "", time: "",
  clientName: "", clientPhone: "", clientEmail: "", notes: "",
};

export const BookingPage: React.FC = () => {
  const [step, setStep]           = useState<Step>(0);
  const [form, setForm]           = useState<FormState>(INITIAL_FORM);
  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [slots, setSlots]         = useState<TimeSlot[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [slotLoading, setSlotLoading]   = useState(false);
  const [pendingBooking, setPendingBooking] = useState<Partial<Appointment> | null>(null);
  const [showPayment, setShowPayment]   = useState(false);

  const selectedService = SERVICES.find((s) => s.serviceId === form.serviceId);
  const selectedStaff   = staff.find((s) => s.staffId === form.staffId);

  // Load staff when service selected
  useEffect(() => {
    if (!form.serviceId) return;
    setStaffLoading(true);
    setForm((f) => ({ ...f, staffId: "", time: "" }));
    staffService.getForService(form.serviceId)
      .then(setStaff)
      .catch(() => setStaff([]))
      .finally(() => setStaffLoading(false));
  }, [form.serviceId]);

  // Load slots when staff + date set
  useEffect(() => {
    if (!form.staffId || !form.date || !form.serviceId) return;
    setSlotLoading(true);
    setForm((f) => ({ ...f, time: "" }));
    slotService.getSlots(form.staffId, form.date, form.serviceId)
      .then((res) => setSlots(res.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotLoading(false));
  }, [form.staffId, form.date, form.serviceId]);

  const set = useCallback((k: keyof FormState) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
  }, []);

  const minDate = new Date().toISOString().split("T")[0];
  const maxDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  })();

  const canAdvance = () => {
    if (step === 0) return !!form.serviceId;
    if (step === 1) return !!form.staffId;
    if (step === 2) return !!form.date && !!form.time;
    if (step === 3) return !!form.clientName && !!form.clientPhone;
    return true;
  };

  const handleProceedToPayment = () => {
    if (!selectedService || !selectedStaff) return;

    // Calculate endTime
    const [h, m] = form.time.split(":").map(Number);
    const endMinutes = h * 60 + m + selectedService.duration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    const booking: Partial<Appointment> = {
      bookingId: uuid(),
      clientName:       form.clientName,
      clientPhone:      form.clientPhone,
      clientEmail:      form.clientEmail,
      serviceId:        form.serviceId,
      serviceName:      selectedService.name,
      serviceDuration:  selectedService.duration,
      staffId:          form.staffId,
      staffName:        selectedStaff.name,
      date:             form.date,
      startTime:        form.time,
      endTime,
      status:           "pending",
      paymentStatus:    "unpaid",
      advanceAmount:    selectedService.advanceAmount,
      totalAmount:      selectedService.price,
      notes:            form.notes,
      createdAt:        new Date().toISOString(),
    };

    setPendingBooking(booking);

    if (selectedService.advanceAmount > 0) {
      setShowPayment(true);
    } else {
      // Free booking — call your existing Firebase booking creation here
      // e.g., await createBooking(booking);
      console.log("Free booking created:", booking);
    }
  };

  const stepContent: Record<Step, React.ReactNode> = {
    0: (
      <div>
        <h2 className="text-xl font-black text-white mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
          Choose a Service
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SERVICES.map((svc) => (
            <motion.button
              key={svc.serviceId}
              type="button"
              onClick={() => { set("serviceId")(svc.serviceId); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-200"
              style={{
                borderColor: form.serviceId === svc.serviceId ? "#c026d3" : "rgba(255,255,255,0.08)",
                background:  form.serviceId === svc.serviceId ? "rgba(192,38,211,0.12)" : "rgba(255,255,255,0.03)",
                boxShadow:   form.serviceId === svc.serviceId ? "0 0 20px #c026d322" : "none",
              }}
            >
              <span className="text-2xl">{svc.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{svc.name}</p>
                <p className="text-white/40 text-xs mt-0.5">{svc.description}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-fuchsia-400 font-bold text-sm">₹{svc.price}</p>
                <p className="text-white/30 text-[10px]">{svc.duration} min</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    ),

    1: (
      <div>
        <h2 className="text-xl font-black text-white mb-6" style={{ fontFamily: "'Syne', sans-serif" }}>
          Select Your Stylist
        </h2>
        <StaffPicker
          staff={staff}
          selected={form.staffId}
          onSelect={set("staffId")}
          loading={staffLoading}
        />
        {!staffLoading && !staff.length && (
          <p className="text-white/30 text-sm mt-4">No stylists available for this service.</p>
        )}
      </div>
    ),

    2: (
      <div className="space-y-6">
        <h2 className="text-xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
          Pick a Date & Time
        </h2>
        <div>
          <label className="text-white/40 text-xs tracking-widest uppercase block mb-2">Date</label>
          <input
            type="date"
            min={minDate}
            max={maxDate}
            value={form.date}
            onChange={(e) => set("date")(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none focus:border-fuchsia-600 transition-all"
            style={{ colorScheme: "dark" }}
          />
        </div>
        {form.date && (
          <SlotPicker
            slots={slots}
            selected={form.time}
            onSelect={set("time")}
            loading={slotLoading}
          />
        )}
      </div>
    ),

    3: (
      <div className="space-y-4">
        <h2 className="text-xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
          Your Details
        </h2>
        {[
          { id: "clientName",  label: "Full Name *",      type: "text",  placeholder: "Jane Doe" },
          { id: "clientPhone", label: "WhatsApp Number *", type: "tel",   placeholder: "+91 98765 43210" },
          { id: "clientEmail", label: "Email (optional)",  type: "email", placeholder: "jane@example.com" },
        ].map((field) => (
          <div key={field.id}>
            <label className="text-white/40 text-xs tracking-wide block mb-1.5">{field.label}</label>
            <input
              type={field.type}
              placeholder={field.placeholder}
              value={(form as any)[field.id]}
              onChange={(e) => set(field.id as keyof FormState)(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none focus:border-fuchsia-600 placeholder:text-white/20 transition-all"
            />
          </div>
        ))}
        <div>
          <label className="text-white/40 text-xs tracking-wide block mb-1.5">Special Requests</label>
          <textarea
            rows={3}
            placeholder="Any notes for your stylist…"
            value={form.notes}
            onChange={(e) => set("notes")(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none focus:border-fuchsia-600 placeholder:text-white/20 resize-none transition-all"
          />
        </div>
        {/* Summary card */}
        {selectedService && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
            <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Booking Summary</p>
            {[
              { l: "Service",  v: selectedService.name },
              { l: "Stylist",  v: selectedStaff?.name  },
              { l: "Date",     v: form.date },
              { l: "Time",     v: form.time },
            ].map(({ l, v }) => v ? (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-white/40">{l}</span>
                <span className="text-white">{v}</span>
              </div>
            ) : null)}
            <div className="border-t border-white/[0.07] pt-2 flex justify-between">
              <span className="text-white/40 text-sm">Total</span>
              <span className="text-white font-bold">₹{selectedService.price}</span>
            </div>
            {selectedService.advanceAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-fuchsia-400 text-sm">Advance Now</span>
                <span className="text-fuchsia-400 font-bold">₹{selectedService.advanceAmount}</span>
              </div>
            )}
          </div>
        )}
      </div>
    ),

    4: (<div />) // handled by PaymentModal
  };

  return (
    <div className="min-h-screen bg-[#07050f] pt-24 pb-20 px-4">
      {/* Background glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[140px] opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #c026d3, #4f46e5)" }}
      />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-fuchsia-400 text-xs tracking-widest uppercase mb-2">Reserve Your Spot</p>
          <h1 className="text-4xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Book Your Session
          </h1>
        </motion.div>

        {/* Step indicators */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <button
                type="button"
                onClick={() => i < step && setStep(i as Step)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                  style={{
                    background: i <= step
                      ? "linear-gradient(135deg, #c026d3, #7c3aed)"
                      : "rgba(255,255,255,0.07)",
                    color: i <= step ? "white" : "rgba(255,255,255,0.3)",
                    boxShadow: i === step ? "0 0 15px #c026d355" : "none",
                  }}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] hidden sm:block ${i === step ? "text-fuchsia-400" : "text-white/25"}`}>
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-px mx-2 transition-all duration-500"
                  style={{
                    background: i < step
                      ? "linear-gradient(90deg, #c026d3, #7c3aed)"
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step card */}
        <motion.div
          className="rounded-3xl border border-white/10 p-8"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
            backdropFilter: "blur(20px)",
            boxShadow: "0 0 60px #7c3aed08, inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {stepContent[step]}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                className="px-6 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-all"
              >
                ← Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                disabled={!canAdvance()}
                onClick={() => setStep((s) => (s + 1) as Step)}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)", boxShadow: "0 0 25px #c026d322" }}
              >
                Continue →
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                disabled={!canAdvance()}
                onClick={handleProceedToPayment}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02] disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100"
                style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)", boxShadow: "0 0 25px #c026d322" }}
              >
                {selectedService?.advanceAmount ? `Pay ₹${selectedService.advanceAmount} & Confirm →` : "Confirm Booking →"}
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPayment}
        booking={pendingBooking}
        onSuccess={(paymentId) => {
          setShowPayment(false);
          setStep(0);
          setForm(INITIAL_FORM);
          console.log("Payment success:", paymentId);
        }}
        onClose={() => setShowPayment(false)}
      />
    </div>
  );
};

export default BookingPage;
