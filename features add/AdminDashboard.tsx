// ============================================================
// frontend/src/pages/AdminDashboard.tsx   ← NEW FILE
// Full admin panel: Revenue, Staff, CRM, Gallery tabs
// ============================================================
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RevenueDashboard } from "../components/admin/RevenueDashboard";
import { StaffManager }     from "../components/admin/StaffManager";
import { CRMTable }         from "../components/admin/CRMTable";
import { GalleryManager }   from "../components/admin/GalleryManager";

const TABS = [
  { id: "revenue", label: "Revenue",  icon: "📊" },
  { id: "staff",   label: "Staff",    icon: "👥" },
  { id: "crm",     label: "Clients",  icon: "🧑‍💼" },
  { id: "gallery", label: "Gallery",  icon: "🖼️" },
];

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("revenue");
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const tabContent: Record<string, React.ReactNode> = {
    revenue: <RevenueDashboard />,
    staff:   <StaffManager />,
    crm:     <CRMTable />,
    gallery: <GalleryManager />,
  };

  return (
    <div className="min-h-screen bg-[#07050f]">
      {/* Background */}
      <div
        className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full blur-[180px] opacity-[0.07] pointer-events-none"
        style={{ background: "radial-gradient(circle, #c026d3, #4f46e5)" }}
      />

      {/* Sidebar */}
      <div className="flex min-h-screen">
        <aside
          className="hidden md:flex flex-col w-60 shrink-0 border-r border-white/[0.06] sticky top-0 h-screen overflow-y-auto"
          style={{ background: "linear-gradient(to bottom, #0a0714, #07050f)" }}
        >
          {/* Logo */}
          <div className="px-6 py-7 border-b border-white/[0.06]">
            <p className="text-white font-black text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
              ✦ LUXÉ Admin
            </p>
            <p className="text-white/30 text-xs mt-0.5">{today}</p>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 p-4 flex-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all duration-200"
                style={{
                  background:  activeTab === tab.id ? "rgba(192,38,211,0.15)" : "transparent",
                  color:       activeTab === tab.id ? "#e879f9"               : "rgba(255,255,255,0.45)",
                  borderLeft:  activeTab === tab.id ? "2px solid #c026d3"     : "2px solid transparent",
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.06]">
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white/30 text-sm hover:text-white hover:bg-white/5 transition-all"
            >
              ← Back to site
            </a>
          </div>
        </aside>

        {/* Mobile tab bar */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-white/[0.06] flex"
          style={{ background: "#0a0714" }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-3 flex flex-col items-center gap-0.5 text-[10px] font-medium transition-all"
              style={{ color: activeTab === tab.id ? "#e879f9" : "rgba(255,255,255,0.35)" }}
            >
              <span className="text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 min-w-0">
          {/* Page header */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <p className="text-fuchsia-400 text-xs tracking-widest uppercase mb-1">Admin Panel</p>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              {TABS.find((t) => t.id === activeTab)?.label}
            </h1>
          </motion.div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {tabContent[activeTab]}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
