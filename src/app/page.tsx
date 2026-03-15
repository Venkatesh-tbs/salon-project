"use client";

import { useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import HeroCanvas from "@/components/HeroCanvas";
import { CursorGlow } from "@/components/ui/cursor-glow";
import { motion } from "framer-motion";
import Link from 'next/link';

// Dynamic imports for improved performance
const ServicesGrid = dynamic(() => import("@/components/ui/services-grid").then(mod => mod.ServicesGrid), {
  loading: () => <div className="py-20 text-center text-white/20 animate-pulse">Loading Expertise...</div>,
  ssr: true,
});

const AppointmentForm = dynamic(() => import("@/components/dashboard/appointment-form").then(mod => mod.AppointmentForm), {
  loading: () => <div className="h-96 w-full bg-white/5 rounded-3xl animate-pulse" />,
  ssr: false,
});

const GallerySection = dynamic(() => import("@/components/GallerySection").then(mod => mod.GallerySection), {
  loading: () => <div className="py-20 text-center text-white/20 animate-pulse">Loading Gallery...</div>,
  ssr: true,
});

/* ── Section Wrapper ──────────────────────────────────────────── */
const Section: React.FC<{ children: React.ReactNode; className?: string; id?: string }> = ({ children, className = "", id }) => (
  <motion.div
    id={id}
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

export default function Home() {
  const bookingRef = useRef<HTMLDivElement>(null);

  const scrollToBooking = useCallback(() => {
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <div className="relative min-h-screen bg-[#07050f] text-white selection:bg-fuchsia-500/30 selection:text-white overflow-x-hidden">
      
      {/* cursor reactive glow — desktop only */}
      <div className="hidden md:block">
        <CursorGlow />
      </div>

      {/* ── Navigation ── */}
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
        <Link href="/" className="group flex items-center gap-2">
           <span
             className="text-xl font-black tracking-tight text-white font-syne"
           >
             ✦ LUXÉ
           </span>
        </Link>
        
        <div className="hidden md:flex items-center gap-10 text-sm font-semibold text-white/50">
          {['Services', 'Gallery', 'About', 'Contact'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition-all transform hover:scale-105">
              {item}
            </a>
          ))}
          <Link href="/admin" className="px-5 py-2 rounded-xl border border-white/10 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/10 transition-all font-syne">
            Admin
          </Link>
          <button
            onClick={scrollToBooking}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(192,38,211,0.3)]"
            style={{
              background: "linear-gradient(135deg, #c026d3, #7c3aed)",
            }}
          >
            Book Now
          </button>
        </div>
      </motion.nav>

      <main>
        {/* ── Hero Section ── */}
        <HeroCanvas onBookNow={scrollToBooking} />

        {/* ── Services Section ── */}
        <Section id="services">
          <ServicesGrid onBook={scrollToBooking} />
        </Section>

        {/* ── Stats Strip ── */}
        <Section>
          <div className="bg-white/[0.02] border-y border-white/[0.06] py-16 md:py-20 px-4 md:px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 text-center">
              {[
                { value: "12+", label: "Years of Excellence" },
                { value: "8K+", label: "Happy Clients" },
                { value: "25+", label: "Expert Stylists" },
                { value: "4.9★", label: "Average Rating" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div
                    className="text-4xl md:text-5xl font-black bg-clip-text text-transparent mb-2 font-syne"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #e879f9, #818cf8)",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-white/40 text-[10px] md:text-sm font-bold tracking-widest uppercase">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Gallery Section ── */}
        <Section id="gallery">
          <GallerySection />
        </Section>

        {/* ── Booking Section ── */}
        <div ref={bookingRef} id="booking">
          <Section className="py-20 md:py-32 px-4 md:px-6">
            <div className="max-w-3xl mx-auto relative">
              <div className="absolute -inset-10 bg-fuchsia-500/10 blur-[120px] rounded-full pointer-events-none" />
              <div className="relative text-center mb-12 md:mb-16">
                 <span className="text-fuchsia-400 text-sm font-bold tracking-[0.3em] uppercase mb-4 block">
                   Reserve Your Chair
                 </span>
                 <h2 className="text-4xl sm:text-5xl md:text-7xl font-black text-white font-syne leading-tight mb-6 px-4">
                   BOOK YOUR <br className="hidden sm:block" />
                   <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(90deg, #e879f9, #818cf8)" }}>SESSION</span>
                 </h2>
              </div>
              <div className="bg-white/[0.03] backdrop-blur-3xl rounded-[2rem] md:rounded-[2.5rem] border border-white/10 p-6 sm:p-10 md:p-16 shadow-2xl relative">
                <AppointmentForm />
              </div>
            </div>
          </Section>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] py-16 md:py-20 px-6 bg-[#07050f] text-center">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 md:gap-10">
          <span className="text-xl md:text-2xl font-black italic tracking-tighter uppercase font-syne">
            ✦ LUXE <span className="text-fuchsia-500">.</span>
          </span>
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-xs font-bold uppercase tracking-[0.2em] text-white/30">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 px-4">
            &copy; {new Date().getFullYear()} LUXE PREMIUM SALON. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}
