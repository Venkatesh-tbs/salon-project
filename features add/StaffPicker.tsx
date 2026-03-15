// ============================================================
// frontend/src/components/booking/StaffPicker.tsx
// ============================================================
import React from "react";
import { motion } from "framer-motion";
import type { StaffMember } from "../../types";

interface Props {
  staff: StaffMember[];
  selected: string;
  onSelect: (staffId: string) => void;
  loading?: boolean;
}

const AVATAR_COLORS = ["#c026d3", "#7c3aed", "#0891b2", "#059669", "#d97706"];

export const StaffPicker: React.FC<Props> = ({ staff, selected, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-24 h-28 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <p className="text-white/40 text-xs tracking-widest uppercase mb-3">Select Stylist</p>
      <div className="flex flex-wrap gap-3">
        {staff.map((s, idx) => {
          const isSelected = selected === s.staffId;
          const color = AVATAR_COLORS[idx % AVATAR_COLORS.length];

          return (
            <motion.button
              key={s.staffId}
              type="button"
              onClick={() => onSelect(s.staffId)}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.96 }}
              className="relative flex flex-col items-center gap-2 px-4 py-3 rounded-2xl border transition-all duration-200 min-w-[90px]"
              style={{
                borderColor: isSelected ? color : "rgba(255,255,255,0.1)",
                background: isSelected ? `${color}18` : "rgba(255,255,255,0.03)",
                boxShadow: isSelected ? `0 0 20px ${color}33` : "none",
              }}
            >
              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}88)` }}
              >
                {s.avatar ? (
                  <img src={s.avatar} alt={s.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  s.name[0].toUpperCase()
                )}
              </div>

              <div className="text-center">
                <p className="text-white text-sm font-semibold">{s.name}</p>
                <p className="text-white/40 text-[10px]">{s.role}</p>
              </div>

              {s.rating && (
                <span className="text-yellow-400 text-[10px]">{"★".repeat(Math.round(s.rating))}</span>
              )}

              {isSelected && (
                <motion.div
                  layoutId="staff-selected"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white"
                  style={{ background: color }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  ✓
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
