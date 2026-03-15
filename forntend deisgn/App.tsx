/**
 * App.tsx  –  Drop-in root that wires all UI components together.
 * Replace / extend as needed. Firebase calls stay in your existing services layer.
 */
"use client";
import React, { useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { CursorGlow } from "./components/CursorGlow";
import { HeroSection } from "./components/HeroSection";
import { ServicesGrid, Service } from "./components/ServicesGrid";
import { BookingForm } from "./components/BookingForm";

/* ── section fade-in wrapper ──────────────────────────────────────────── */
const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ── global font injection (add to index.html if preferred) ───────────── */
const GlobalFonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800;900&family=DM+Sans:wght@300;400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { background: #07050f; color: white; margin: 0;
           font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: #07050f; }
    ::-webkit-scrollbar-thumb { background: #7c3aed55; border-radius: 99px; }
    ::selection { background: #c026d344; color: white; }
  `}</style>
);

/* ── minimal nav ──────────────────────────────────────────────────────── */
const Nav = React.memo(({ onBookNow }: { onBookNow: () => void }) => (
  <motion.nav
    initial={{ y: -20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    className="fixed top-0 inset-x-0 z-50 px-6 py-4 flex items-center justify-between"
    style={{
      background: "linear-gradient(to bottom, rgba(7,5,15,0.95), transparent)",
      backdropFilter: "blur(12px)",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}
  >
    <span
      className="text-xl font-black tracking-tight text-white"
      style={{ fontFamily: "'Syne', sans-serif" }}
    >
      ✦ LUXÉ
    </span>
    <div className="hidden md:flex items-center gap-8 text-sm text-white/50">
      {["Services", "Gallery", "About", "Contact"].map((item) => (
        <a
          key={item}
          href={`#${item.toLowerCase()}`}
          className="hover:text-white transition-colors duration-200"
        >
          {item}
        </a>
      ))}
    </div>
    <button
      onClick={onBookNow}
      className="px-5 py-2 rounded-xl text-sm font-semibold text-white border border-fuchsia-500/40 hover:bg-fuchsia-500/15 transition-all duration-200"
    >
      Book Now
    </button>
  </motion.nav>
));
Nav.displayName = "Nav";

/* ── main app ─────────────────────────────────────────────────────────── */
const App: React.FC = () => {
  const bookingRef = useRef<HTMLDivElement>(null);

  const scrollToBooking = useCallback(() => {
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleServiceBook = useCallback((service: Service) => {
    scrollToBooking();
    // optionally pre-fill form via state/context
    console.log("Pre-fill service:", service.name);
  }, [scrollToBooking]);

  const handleFormSubmit = useCallback(async (data: Parameters<typeof BookingForm>[0] extends { onSubmit?: (d: infer D) => any } ? D : never) => {
    // ← Insert your existing Firebase booking call here, e.g.:
    // await addBookingToFirestore(data);
    console.log("Booking submitted:", data);
    await new Promise((r) => setTimeout(r, 1500)); // remove in production
  }, []);

  return (
    <>
      <GlobalFonts />

      {/* cursor reactive glow — desktop only */}
      <div className="hidden md:block">
        <CursorGlow />
      </div>

      <Nav onBookNow={scrollToBooking} />

      <main>
        {/* Hero */}
        <HeroSection onBookNow={scrollToBooking} />

        {/* Services */}
        <Section id="services">
          <ServicesGrid onBook={handleServiceBook} />
        </Section>

        {/* Stats strip */}
        <Section>
          <div className="bg-white/[0.02] border-y border-white/[0.06] py-12 px-6">
            <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "12+", label: "Years of Excellence" },
                { value: "8K+", label: "Happy Clients" },
                { value: "25+", label: "Expert Stylists" },
                { value: "4.9★", label: "Average Rating" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    className="text-4xl font-black bg-clip-text text-transparent mb-1"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #e879f9, #818cf8)",
                      fontFamily: "'Syne', sans-serif",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-white/40 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Booking Form */}
        <div ref={bookingRef} id="booking">
          <Section>
            <BookingForm onSubmit={handleFormSubmit} />
          </Section>
        </div>
      </main>

      {/* footer */}
      <footer className="border-t border-white/[0.06] py-10 px-6 text-center text-white/25 text-sm bg-[#07050f]">
        <span style={{ fontFamily: "'Syne', sans-serif" }}>✦ LUXÉ SALON</span>
        {" · "}Coimbatore, Tamil Nadu
        {" · "}© {new Date().getFullYear()}
      </footer>
    </>
  );
};

export default App;
