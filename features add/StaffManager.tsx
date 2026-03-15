// ============================================================
// frontend/src/components/admin/StaffManager.tsx
// ============================================================
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { staffService } from "../../services/api";
import type { StaffMember } from "../../types";

const SERVICES_LIST = [
  { id: "svc_001", name: "Precision Cut" },
  { id: "svc_002", name: "Color & Balayage" },
  { id: "svc_003", name: "Luxury Facial" },
  { id: "svc_004", name: "Nail Art Studio" },
  { id: "svc_005", name: "Keratin Therapy" },
  { id: "svc_006", name: "Bridal Package" },
  { id: "svc_007", name: "Scalp Ritual" },
  { id: "svc_008", name: "Blowout & Style" },
];

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as const;

const emptyForm = () => ({
  name: "", role: "", services: [] as string[],
  availability: Object.fromEntries(
    DAYS.map((d) => [d, { isOpen: d !== "sunday", startTime: "09:00", endTime: "19:00" }])
  ),
});

export const StaffManager: React.FC = () => {
  const [staff, setStaff]       = useState<StaffMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(emptyForm());
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    staffService.getAll().then(setStaff).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.role) return;
    setSaving(true);
    try {
      if (editId) {
        await staffService.update(editId, form);
      } else {
        await staffService.create(form);
      }
      setShowForm(false);
      setForm(emptyForm());
      setEditId(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (staffId: string) => {
    if (!window.confirm("Deactivate this staff member?")) return;
    await staffService.remove(staffId);
    load();
  };

  const handleEdit = (s: StaffMember) => {
    setForm({
      name: s.name, role: s.role,
      services: s.services,
      availability: s.availability as any,
    });
    setEditId(s.staffId);
    setShowForm(true);
  };

  const toggleService = (id: string) => {
    setForm((f) => ({
      ...f,
      services: f.services.includes(id) ? f.services.filter((s) => s !== id) : [...f.services, id],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Staff Management
          </h2>
          <p className="text-white/40 text-sm">{staff.length} active stylists</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm()); setEditId(null); setShowForm(true); }}
          className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)" }}
        >
          + Add Stylist
        </button>
      </div>

      {/* Staff grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1,2,3].map((i) => <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((s) => (
            <motion.div
              key={s.staffId}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)" }}
                  >
                    {s.name[0]}
                  </div>
                  <div>
                    <p className="text-white font-semibold">{s.name}</p>
                    <p className="text-white/40 text-xs">{s.role}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(s)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all text-xs"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(s.staffId)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all text-xs"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {s.services?.slice(0, 3).map((svcId) => {
                  const svc = SERVICES_LIST.find((x) => x.id === svcId);
                  return svc ? (
                    <span key={svcId} className="px-2 py-0.5 rounded-full text-[10px] bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/20">
                      {svc.name}
                    </span>
                  ) : null;
                })}
                {(s.services?.length || 0) > 3 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/30">
                    +{s.services.length - 3}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold"
                    style={{
                      background: (s.availability as any)?.[d]?.isOpen ? "#7c3aed33" : "rgba(255,255,255,0.05)",
                      color:      (s.availability as any)?.[d]?.isOpen ? "#a78bfa" : "rgba(255,255,255,0.2)",
                    }}
                    title={d}
                  >
                    {d[0].toUpperCase()}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <motion.div
              className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 overflow-hidden overflow-y-auto max-h-[90vh]"
              style={{ background: "linear-gradient(135deg, #0f0a1e, #1a0d2e)" }}
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
            >
              <div className="h-1" style={{ background: "linear-gradient(90deg, #c026d3, #7c3aed)" }} />
              <div className="p-7 space-y-5">
                <h3 className="text-lg font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {editId ? "Edit Stylist" : "New Stylist"}
                </h3>

                {[
                  { key: "name", label: "Full Name", placeholder: "Rahul" },
                  { key: "role", label: "Role / Title", placeholder: "Senior Stylist" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-white/40 text-xs block mb-1.5">{f.label}</label>
                    <input
                      type="text"
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none focus:border-fuchsia-600 transition-all placeholder:text-white/20"
                    />
                  </div>
                ))}

                {/* Services */}
                <div>
                  <label className="text-white/40 text-xs block mb-2">Services</label>
                  <div className="flex flex-wrap gap-2">
                    {SERVICES_LIST.map((svc) => (
                      <button
                        key={svc.id}
                        type="button"
                        onClick={() => toggleService(svc.id)}
                        className="px-3 py-1.5 rounded-full text-xs border transition-all"
                        style={{
                          borderColor: form.services.includes(svc.id) ? "#c026d3" : "rgba(255,255,255,0.1)",
                          background:  form.services.includes(svc.id) ? "#c026d322" : "transparent",
                          color:       form.services.includes(svc.id) ? "#e879f9"   : "rgba(255,255,255,0.5)",
                        }}
                      >
                        {svc.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Availability */}
                <div>
                  <label className="text-white/40 text-xs block mb-2">Working Days</label>
                  <div className="space-y-2">
                    {DAYS.map((day) => {
                      const sched = (form.availability as any)[day];
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({
                              ...f,
                              availability: {
                                ...(f.availability as any),
                                [day]: { ...sched, isOpen: !sched.isOpen },
                              },
                            }))}
                            className="w-14 text-[10px] font-semibold py-1 rounded-lg capitalize border transition-all"
                            style={{
                              borderColor: sched.isOpen ? "#7c3aed" : "rgba(255,255,255,0.1)",
                              background:  sched.isOpen ? "#7c3aed22" : "transparent",
                              color:       sched.isOpen ? "#a78bfa"   : "rgba(255,255,255,0.3)",
                            }}
                          >
                            {day.slice(0, 3)}
                          </button>
                          {sched.isOpen && (
                            <div className="flex items-center gap-2 text-xs text-white/50">
                              <input
                                type="time"
                                value={sched.startTime}
                                onChange={(e) => setForm((f) => ({
                                  ...f,
                                  availability: { ...(f.availability as any), [day]: { ...sched, startTime: e.target.value } },
                                }))}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none"
                                style={{ colorScheme: "dark" }}
                              />
                              <span>–</span>
                              <input
                                type="time"
                                value={sched.endTime}
                                onChange={(e) => setForm((f) => ({
                                  ...f,
                                  availability: { ...(f.availability as any), [day]: { ...sched, endTime: e.target.value } },
                                }))}
                                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none"
                                style={{ colorScheme: "dark" }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)" }}
                  >
                    {saving ? "Saving…" : editId ? "Update" : "Add Stylist"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
