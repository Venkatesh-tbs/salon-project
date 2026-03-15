// ============================================================
// frontend/src/App.tsx   ← MODIFIED
// Add these routes to your existing router.
// Keep all existing routes untouched.
// ============================================================
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

// ── Existing pages (keep yours) ──────────────────────────────
// import Home from "./pages/Home";

// ── NEW pages (lazy loaded) ───────────────────────────────────
const BookingPage    = lazy(() => import("./pages/BookingPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));

const PageLoader = () => (
  <div className="min-h-screen bg-[#07050f] flex items-center justify-center">
    <div className="w-10 h-10 border-2 border-fuchsia-500/30 border-t-fuchsia-500 rounded-full animate-spin" />
  </div>
);

const App: React.FC = () => (
  <BrowserRouter>
    {/* Global toast notifications */}
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#1a0d2e",
          color: "white",
          border: "1px solid rgba(192,38,211,0.3)",
          borderRadius: "12px",
          fontSize: "14px",
        },
        success: { iconTheme: { primary: "#c026d3", secondary: "white" } },
      }}
    />

    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Keep existing routes ───────────────────────── */}
        {/* <Route path="/" element={<Home />} /> */}

        {/* ── NEW routes ─────────────────────────────────── */}
        <Route path="/booking"  element={<BookingPage />} />
        <Route path="/admin"    element={<AdminDashboard />} />

        {/* Fallback */}
        <Route path="*" element={<div className="min-h-screen bg-[#07050f] flex items-center justify-center text-white/40">Page not found</div>} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
