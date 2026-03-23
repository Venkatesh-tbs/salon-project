"use client";
import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring, Variants, useScroll } from "framer-motion";


interface HeroCanvasProps {
  onBookNow?: () => void;
}

/**
 * HeroCanvas (Refactored to new UI design)
 * Replaces the Three.js version with the Framer Motion based high-fidelity design.
 */
export default function HeroCanvas({ onBookNow }: HeroCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 60, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 60, damping: 20 });
  const glowX = useTransform(springX, [-0.5, 0.5], ["-15%", "15%"]);
  const glowY = useTransform(springY, [-0.5, 0.5], ["-15%", "15%"]);
  const parallaxX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const parallaxY = useTransform(springY, [-0.5, 0.5], [-10, 10]);

  // Scroll effect (Apple Style)
  const { scrollY } = useScroll();
  const videoScale = useTransform(scrollY, [0, 500], [1, 1.1]);
  const videoOpacity = useTransform(scrollY, [0, 500], [0.6, 0.3]);

  // Generate particles client-side only to prevent SSR/client mismatch
  const [mounted, setMounted] = React.useState(false);
  const particles = React.useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 6 + 5,
        delay: Math.random() * 4,
      })),
    [] // Only runs once on the client after mount
  );

  useEffect(() => {
    setMounted(true);
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const { left, top, width, height } = el.getBoundingClientRect();
      rawX.set((e.clientX - left) / width - 0.5);
      rawY.set((e.clientY - top) / height - 0.5);
    };
    el.addEventListener("mousemove", onMove, { passive: true });
    return () => el.removeEventListener("mousemove", onMove);
  }, [rawX, rawY]);

  return (
    <section
      ref={containerRef}
      className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-transparent"
    >
      {/* ── Video Background & Apple Scroll Parallax ── */}
      <motion.div 
        className="absolute inset-0 z-0 w-full h-full overflow-hidden"
        style={{ scale: videoScale, opacity: videoOpacity }}
      >
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          poster="/hero-fallback.jpg"
          className="hidden md:block absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/salon-hero.mp4" type="video/mp4" />
        </video>
        <img 
          src="/hero-fallback.jpg" 
          alt="Salon Hero"
          className="md:hidden absolute inset-0 w-full h-full object-cover" 
        />
      </motion.div>
      <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px]" />

      {/* ambient orbs */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #9333ea 0%, #6d28d9 50%, transparent 70%)",
          x: glowX,
          y: glowY,
          top: "10%",
          left: "0%",
        }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #ec4899 0%, #be185d 60%, transparent 80%)",
          bottom: "10%",
          right: "0%",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* floating particles — only rendered after client mount to avoid hydration mismatch */}
      {mounted && particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-fuchsia-400/40 pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -24, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* hero content */}
      <motion.div
        className="relative z-20 flex flex-col items-center justify-center h-full text-center px-4 max-w-5xl mx-auto"
        initial={{ opacity: 0, scale: 1.2 }}
        animate={{ opacity: 1, scale: 1, y: [0, -10, 0] }}
        transition={{ 
          duration: 1.2, ease: "easeOut",
          y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1.2 } 
        }}
        style={{ x: parallaxX, y: parallaxY }}
      >
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 text-sm font-medium tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            Premium Salon Experience
          </span>
        </div>

        <h1
          className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight leading-none mb-6"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          <span className="block text-white">STYLE</span>
          <span
            className="block bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #e879f9 0%, #a855f7 50%, #6366f1 100%)" }}
          >
            BEYOND
          </span>
          <span className="block text-white">LIMITS</span>
        </h1>

        <p
          className="text-base sm:text-lg md:text-xl text-white/50 max-w-xl mx-auto mb-10 leading-relaxed px-4"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Where artistry meets precision. Elevate your presence with bespoke
          beauty crafted for those who demand the extraordinary.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 w-full sm:w-auto">
          <button
            onClick={onBookNow}
            className="relative group px-8 py-4 rounded-2xl font-semibold text-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/40 hover:scale-105 active:scale-95 w-full sm:w-auto"
            style={{
              background: "linear-gradient(135deg, #c026d3, #7c3aed)",
            }}
          >
            <span className="relative z-10 tracking-wide">Book Now</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          <button 
            onClick={() => {
              document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-8 py-4 rounded-2xl font-semibold text-white/70 border border-white/15 hover:border-fuchsia-500/50 hover:text-white transition-all duration-300 hover:scale-[1.03] active:scale-95 backdrop-blur-sm w-full sm:w-auto"
          >
            Explore Services
          </button>
        </div>
      </motion.div>
    </section>
  );
}
