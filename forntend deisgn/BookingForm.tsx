"use client";
import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BookingFormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  date: string;
  time: string;
  notes: string;
}

interface BookingFormProps {
  services?: string[];
  onSubmit?: (data: BookingFormData) => Promise<void>;
}

const FIELDS: { id: keyof BookingFormData; label: string; type: string; placeholder?: string }[] = [
  { id: "name", label: "Full Name", type: "text", placeholder: "Jane Doe" },
  { id: "phone", label: "Phone Number", type: "tel", placeholder: "+91 98765 43210" },
  { id: "email", label: "Email Address", type: "email", placeholder: "jane@example.com" },
  { id: "date", label: "Preferred Date", type: "date" },
  { id: "time", label: "Preferred Time", type: "time" },
];

const DEFAULT_SERVICES = [
  "Precision Cut", "Color & Balayage", "Luxury Facial", "Nail Art Studio",
  "Keratin Therapy", "Bridal Package", "Scalp Ritual", "Blowout & Style",
];

// Ripple button
const RippleButton: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, loading, children }) => {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const { left, top } = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position:absolute;width:4px;height:4px;border-radius:50%;
      background:rgba(255,255,255,0.5);
      transform:scale(0);animation:ripple 0.6s linear;
      left:${e.clientX - left - 2}px;top:${e.clientY - top - 2}px;
      pointer-events:none;
    `;
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
    if (!disabled && !loading) onClick();
  };

  return (
    <button
      ref={btnRef}
      type="button"
      disabled={disabled || loading}
      onClick={handleClick}
      className="relative w-full py-4 rounded-2xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: loading
          ? "linear-gradient(135deg, #9333ea, #6d28d9)"
          : "linear-gradient(135deg, #c026d3, #7c3aed, #6366f1)",
        backgroundSize: "200% 200%",
        animation: loading ? "none" : "gradientShift 3s ease infinite",
        boxShadow: "0 0 40px #c026d322, 0 4px 20px #7c3aed33",
        fontFamily: "'Syne', sans-serif",
        letterSpacing: "0.05em",
      }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-3"
          >
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Processing...
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

// FloatingInput
const FloatingInput: React.FC<{
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}> = ({ id, label, type, value, placeholder, onChange }) => {
  const [focused, setFocused] = useState(false);
  const raised = focused || value.length > 0;

  return (
    <div className="relative group">
      <label
        htmlFor={id}
        className="absolute z-10 pointer-events-none transition-all duration-200 font-medium"
        style={{
          left: "1rem",
          top: raised ? "-0.6rem" : "1rem",
          fontSize: raised ? "0.7rem" : "0.9rem",
          color: focused ? "#e879f9" : raised ? "#a855f7" : "rgba(255,255,255,0.35)",
          background: raised ? "#07050f" : "transparent",
          padding: raised ? "0 0.25rem" : "0",
          lineHeight: 1,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={focused ? placeholder ?? "" : ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-4 pt-5 pb-3 rounded-xl bg-white/[0.04] border text-white text-sm outline-none transition-all duration-200"
        style={{
          borderColor: focused ? "#c026d3" : "rgba(255,255,255,0.1)",
          boxShadow: focused ? "0 0 0 3px #c026d322, inset 0 0 20px #c026d308" : "none",
          caretColor: "#e879f9",
        }}
      />
    </div>
  );
};

export const BookingForm: React.FC<BookingFormProps> = React.memo(
  ({ services = DEFAULT_SERVICES, onSubmit }) => {
    const [form, setForm] = useState<BookingFormData>({
      name: "", phone: "", email: "", service: "", date: "", time: "", notes: "",
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const set = useCallback((k: keyof BookingFormData) => (v: string) => {
      setForm((f) => ({ ...f, [k]: v }));
    }, []);

    const handleSubmit = async () => {
      if (!form.name || !form.phone || !form.service || !form.date) return;
      setLoading(true);
      try {
        await onSubmit?.(form);
        setSuccess(true);
        setForm({ name: "", phone: "", email: "", service: "", date: "", time: "", notes: "" });
      } finally {
        setLoading(false);
      }
    };

    return (
      <section className="relative py-28 px-6 bg-[#07050f] overflow-hidden">
        {/* glow backdrop */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[140px] opacity-15 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #c026d3, #4f46e5)" }}
        />

        <div className="max-w-2xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12"
          >
            <span className="text-fuchsia-400 text-sm font-semibold tracking-widest uppercase mb-3 block">
              Reserve Your Spot
            </span>
            <h2
              className="text-4xl md:text-5xl font-black text-white tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Book{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #e879f9, #818cf8)" }}
              >
                Your Session
              </span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 md:p-10"
            style={{ boxShadow: "0 0 80px #7c3aed0a, inset 0 1px 0 rgba(255,255,255,0.05)" }}
          >
            <AnimatePresence mode="wait">
              {success ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center py-12 flex flex-col items-center gap-4"
                >
                  <div className="text-6xl">✨</div>
                  <h3 className="text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                    You're Booked!
                  </h3>
                  <p className="text-white/50">We'll confirm your appointment shortly.</p>
                  <button
                    onClick={() => setSuccess(false)}
                    className="mt-4 px-6 py-2 rounded-xl border border-fuchsia-500/40 text-fuchsia-300 text-sm hover:bg-fuchsia-500/10 transition-all"
                  >
                    Book Another
                  </button>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {FIELDS.slice(0, 2).map((f) => (
                      <FloatingInput
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type={f.type}
                        placeholder={f.placeholder}
                        value={form[f.id]}
                        onChange={set(f.id)}
                      />
                    ))}
                  </div>

                  <FloatingInput
                    id="email"
                    label="Email Address"
                    type="email"
                    placeholder="jane@example.com"
                    value={form.email}
                    onChange={set("email")}
                  />

                  {/* Service select */}
                  <div className="relative group">
                    <label
                      className="absolute z-10 pointer-events-none text-xs font-medium tracking-wider"
                      style={{
                        left: "1rem",
                        top: form.service ? "-0.6rem" : "1rem",
                        fontSize: form.service ? "0.7rem" : "0.9rem",
                        color: form.service ? "#a855f7" : "rgba(255,255,255,0.35)",
                        background: form.service ? "#07050f" : "transparent",
                        padding: form.service ? "0 0.25rem" : "0",
                        transition: "all 0.2s",
                      }}
                    >
                      Select Service
                    </label>
                    <select
                      value={form.service}
                      onChange={(e) => set("service")(e.target.value)}
                      className="w-full px-4 pt-5 pb-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none transition-all duration-200 appearance-none cursor-pointer"
                      style={{ colorScheme: "dark" }}
                    >
                      <option value="" disabled />
                      {services.map((s) => (
                        <option key={s} value={s} className="bg-[#1a1030]">
                          {s}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                      ▾
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {FIELDS.slice(3).map((f) => (
                      <FloatingInput
                        key={f.id}
                        id={f.id}
                        label={f.label}
                        type={f.type}
                        value={form[f.id]}
                        onChange={set(f.id)}
                      />
                    ))}
                  </div>

                  {/* notes */}
                  <div className="relative">
                    <textarea
                      value={form.notes}
                      onChange={(e) => set("notes")(e.target.value)}
                      placeholder="Any special requests or notes..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none resize-none transition-all duration-200 placeholder:text-white/25 focus:border-fuchsia-600 focus:shadow-[0_0_0_3px_#c026d322]"
                    />
                  </div>

                  <RippleButton onClick={handleSubmit} loading={loading}>
                    Confirm Booking ✦
                  </RippleButton>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ripple keyframe injection */}
        <style>{`
          @keyframes ripple { to { transform: scale(80); opacity: 0; } }
          @keyframes gradientShift {
            0%   { background-position: 0%   50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0%   50%; }
          }
        `}</style>
      </section>
    );
  }
);
BookingForm.displayName = "BookingForm";
