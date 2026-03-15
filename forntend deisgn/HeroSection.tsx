"use client";
import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 6 + 5,
  delay: Math.random() * 4,
}));

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } },
};

interface HeroSectionProps {
  onBookNow?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = React.memo(({ onBookNow }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 60, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 60, damping: 20 });
  const glowX = useTransform(springX, [-0.5, 0.5], ["-15%", "15%"]);
  const glowY = useTransform(springY, [-0.5, 0.5], ["-15%", "15%"]);
  const parallaxX = useTransform(springX, [-0.5, 0.5], [-20, 20]);
  const parallaxY = useTransform(springY, [-0.5, 0.5], [-10, 10]);

  useEffect(() => {
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
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#07050f]"
    >
      {/* ambient orbs */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #9333ea 0%, #6d28d9 50%, transparent 70%)",
          x: glowX,
          y: glowY,
          top: "10%",
          left: "20%",
        }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #ec4899 0%, #be185d 60%, transparent 80%)",
          bottom: "10%",
          right: "15%",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* floating particles */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-fuchsia-400/40 pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{ y: [0, -24, 0], opacity: [0, 0.7, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* grid texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      {/* hero content */}
      <motion.div
        className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        variants={stagger}
        initial="hidden"
        animate="visible"
        style={{ x: parallaxX, y: parallaxY }}
      >
        <motion.div variants={fadeUp} className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300 text-sm font-medium tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
            Premium Salon Experience
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          className="text-6xl md:text-8xl font-black tracking-tight leading-none mb-6"
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
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="text-lg md:text-xl text-white/50 max-w-xl mx-auto mb-10 leading-relaxed"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Where artistry meets precision. Elevate your presence with bespoke
          beauty crafted for those who demand the extraordinary.
        </motion.p>

        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onBookNow}
            className="relative group px-8 py-4 rounded-2xl font-semibold text-white overflow-hidden transition-all duration-300 hover:scale-105 active:scale-100"
            style={{
              background: "linear-gradient(135deg, #c026d3, #7c3aed)",
              boxShadow: "0 0 30px #c026d355",
            }}
          >
            <span className="relative z-10 tracking-wide">Book Now</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
          <button className="px-8 py-4 rounded-2xl font-semibold text-white/70 border border-white/15 hover:border-fuchsia-500/50 hover:text-white transition-all duration-300 hover:scale-105 backdrop-blur-sm">
            Explore Services
          </button>
        </motion.div>
      </motion.div>

      {/* scroll indicator */}
      <motion.div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="text-white/50 text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-fuchsia-400 to-transparent" />
      </motion.div>
    </section>
  );
});
HeroSection.displayName = "HeroSection";
