// ============================================================
// frontend/src/components/booking/SlotPicker.tsx
// ============================================================
import React from "react";
import { motion } from "framer-motion";
import type { TimeSlot } from "../../types";

interface Props {
  slots: TimeSlot[];
  selected: string;
  onSelect: (time: string) => void;
  loading?: boolean;
}

export const SlotPicker: React.FC<Props> = ({ slots, selected, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-10 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className="text-center py-6 text-white/30 text-sm">
        No slots available for this date. Please select another date or stylist.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <p className="text-white/40 text-xs tracking-widest uppercase">Available Times</p>
        <div className="flex items-center gap-3 text-[10px] text-white/30">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-fuchsia-500" /> Available
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white/10" /> Booked
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {slots.map((slot, idx) => {
          const isSelected = selected === slot.time;
          const isBooked   = !slot.available;

          return (
            <motion.button
              key={slot.time}
              type="button"
              disabled={isBooked}
              onClick={() => !isBooked && onSelect(slot.time)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.02, duration: 0.2 }}
              whileHover={!isBooked ? { scale: 1.05 } : {}}
              whileTap={!isBooked ? { scale: 0.95 } : {}}
              className="relative py-2.5 rounded-xl text-xs font-medium transition-all duration-200 overflow-hidden"
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, #c026d3, #7c3aed)"
                  : isBooked
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.07)",
                color: isSelected ? "white" : isBooked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.7)",
                cursor: isBooked ? "not-allowed" : "pointer",
                boxShadow: isSelected ? "0 0 15px #c026d344" : "none",
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: isSelected
                  ? "#c026d3"
                  : isBooked
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(255,255,255,0.1)",
              }}
            >
              {slot.time}
              {isBooked && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(255,255,255,0.03) 4px, rgba(255,255,255,0.03) 8px)" }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
