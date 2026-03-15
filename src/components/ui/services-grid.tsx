"use client";
import React from "react";
import { motion } from "framer-motion";
import { AnimatedCard } from "./animated-card";

export interface Service {
  id: string;
  icon: string;
  name: string;
  duration: string;
  price: string;
  description?: string;
  glowColor?: string;
}

const DEFAULT_SERVICES: Service[] = [
  { id: "1", icon: "✂️", name: "Precision Cut", duration: "45 min", price: "₹599", description: "Expert sculpting tailored to your face", glowColor: "#a855f7" },
  { id: "2", icon: "🎨", name: "Color & Balayage", duration: "2–3 hrs", price: "₹2499", description: "Dimensional color with seamless blending", glowColor: "#ec4899" },
  { id: "3", icon: "💆", name: "Luxury Facial", duration: "60 min", price: "₹1299", description: "Rejuvenating treatment for radiant skin", glowColor: "#6366f1" },
  { id: "4", icon: "💅", name: "Nail Art Studio", duration: "50 min", price: "₹799", description: "Bespoke designs from minimal to bold", glowColor: "#f43f5e" },
  { id: "5", icon: "🌿", name: "Keratin Therapy", duration: "3 hrs", price: "₹3499", description: "Frizz-free transformation that lasts", glowColor: "#10b981" },
  { id: "6", icon: "👑", name: "Bridal Package", duration: "Full Day", price: "₹9999", description: "Complete look for your most important day", glowColor: "#f59e0b" },
  { id: "7", icon: "🧖", name: "Scalp Ritual", duration: "40 min", price: "₹899", description: "Deep nourishment & stress relief", glowColor: "#8b5cf6" },
  { id: "8", icon: "🔥", name: "Blowout & Style", duration: "30 min", price: "₹499", description: "Salon-finish volume and shine", glowColor: "#f97316" },
];

const sectionVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

interface ServicesGridProps {
  services?: Service[];
  onBook?: (service: Service) => void;
}

export const ServicesGrid: React.FC<ServicesGridProps> = React.memo(
  ({ services = DEFAULT_SERVICES, onBook }) => {
    return (
      <section className="relative py-28 px-6 bg-[#07050f] overflow-hidden">
        {/* background glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full blur-[160px] opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #7c3aed, #be185d)" }}
        />

        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-16"
          >
            <span className="text-fuchsia-400 text-sm font-semibold tracking-widest uppercase mb-3 block">
              Our Expertise
            </span>
            <h2
              className="text-4xl md:text-6xl font-black text-white tracking-tight"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Signature{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, #e879f9, #818cf8)" }}
              >
                Services
              </span>
            </h2>
          </motion.div>

          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {services.map((service) => (
              <AnimatedCard key={service.id} glowColor={service.glowColor}>
                <div className="p-6 flex flex-col h-full min-h-[220px]">
                  {/* icon */}
                  <motion.div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 border border-white/10"
                    style={{ background: `${service.glowColor}18` }}
                    whileHover={{ rotate: [0, -8, 8, -4, 0], scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                  >
                    {service.icon}
                  </motion.div>

                  <h3
                    className="text-white font-bold text-lg mb-1"
                    style={{ fontFamily: "'Syne', sans-serif" }}
                  >
                    {service.name}
                  </h3>

                  {service.description && (
                    <p className="text-white/40 text-sm leading-relaxed flex-1 mb-4">
                      {service.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/[0.07]">
                    <span className="text-white/40 text-xs tracking-wide">⏱ {service.duration}</span>
                    <span
                      className="font-bold text-base"
                      style={{ color: service.glowColor ?? "#e879f9" }}
                    >
                      {service.price}
                    </span>
                  </div>

                  {onBook && (
                    <button
                      onClick={() => onBook(service)}
                      className="mt-4 w-full py-2.5 rounded-xl text-sm font-semibold text-white/80 border border-white/10 hover:border-fuchsia-500/60 hover:text-white hover:bg-fuchsia-500/10 transition-all duration-200"
                    >
                      Book →
                    </button>
                  )}
                </div>
              </AnimatedCard>
            ))}
          </motion.div>
        </div>
      </section>
    );
  }
);
ServicesGrid.displayName = "ServicesGrid";
