"use client";
import React, { useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = React.memo(
  ({ children, className = "", glowColor = "#d946ef" }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const rotateRef = useRef({ x: 0, y: 0 });
    const glowRef = useRef<HTMLDivElement>(null);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      const rotX = ((y / height) - 0.5) * -16;
      const rotY = ((x / width) - 0.5) * 16;
      rotateRef.current = { x: rotX, y: rotY };
      card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(12px)`;
      if (glowRef.current) {
        glowRef.current.style.background = `radial-gradient(circle at ${x}px ${y}px, ${glowColor}33 0%, transparent 65%)`;
      }
    }, [glowColor]);

    const handleMouseLeave = useCallback(() => {
      const card = cardRef.current;
      if (!card) return;
      card.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
      if (glowRef.current) glowRef.current.style.background = "transparent";
    }, []);

    return (
      <motion.div
        className={`relative ${className}`}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transition: "transform 0.15s ease-out, box-shadow 0.25s ease",
            willChange: "transform",
          }}
          className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md cursor-pointer group"
        >
          {/* gradient border glow on hover */}
          <div
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{
              boxShadow: `0 0 0 1px ${glowColor}55, 0 8px 40px ${glowColor}22`,
            }}
          />
          {/* mouse-follow internal glow */}
          <div
            ref={glowRef}
            className="pointer-events-none absolute inset-0 z-0 rounded-2xl transition-all duration-150"
          />
          <div className="relative z-10">{children}</div>
        </div>
      </motion.div>
    );
  }
);
AnimatedCard.displayName = "AnimatedCard";
