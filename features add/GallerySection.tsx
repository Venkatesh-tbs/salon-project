// ============================================================
// frontend/src/components/GallerySection.tsx   ← NEW
// Public-facing gallery / portfolio section
// ============================================================
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { galleryService } from "../services/api";
import type { GalleryItem } from "../types";

const FILTER_TABS = [
  { id: "all",         label: "All Work" },
  { id: "haircut",     label: "Haircuts"  },
  { id: "color",       label: "Color"     },
  { id: "beforeafter", label: "Before / After" },
  { id: "portfolio",   label: "Portfolio" },
];

export const GallerySection: React.FC = () => {
  const [items, setItems]       = useState<GalleryItem[]>([]);
  const [active, setActive]     = useState("all");
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    galleryService.getAll().then(setItems).finally(() => setLoading(false));
  }, []);

  const filtered = active === "all"
    ? items
    : items.filter((i) => i.category === active);

  return (
    <section className="relative py-28 px-6 bg-[#07050f] overflow-hidden" id="gallery">
      {/* Ambient */}
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[300px] rounded-full blur-[140px] opacity-10 pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #7c3aed, #c026d3)" }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="text-fuchsia-400 text-sm font-semibold tracking-widest uppercase mb-3 block">
            Our Portfolio
          </span>
          <h2
            className="text-4xl md:text-6xl font-black text-white tracking-tight"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            The{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, #e879f9, #818cf8)" }}
            >
              Art
            </span>{" "}
            We Create
          </h2>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {FILTER_TABS.map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2 rounded-full text-sm font-medium border transition-all duration-200"
              style={{
                borderColor: active === tab.id ? "#c026d3" : "rgba(255,255,255,0.1)",
                background:  active === tab.id ? "rgba(192,38,211,0.15)" : "transparent",
                color:       active === tab.id ? "#e879f9" : "rgba(255,255,255,0.5)",
                boxShadow:   active === tab.id ? "0 0 15px #c026d322" : "none",
              }}
            >
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Image grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-white/30 py-16">No images available yet.</p>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <AnimatePresence>
              {filtered.map((item, i) => (
                <motion.div
                  key={item.itemId}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className={`relative group cursor-pointer rounded-2xl overflow-hidden border border-white/10 ${
                    i % 7 === 0 ? "md:col-span-2 md:row-span-2" : ""
                  }`}
                  style={{ aspectRatio: i % 7 === 0 ? "1" : "1" }}
                  onClick={() => setLightbox(item)}
                >
                  <img
                    src={item.imageUrl}
                    alt={item.caption || "gallery"}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      {item.caption && (
                        <p className="text-white text-sm font-semibold">{item.caption}</p>
                      )}
                      {item.staffName && (
                        <p className="text-white/60 text-xs">by {item.staffName}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              className="relative max-w-3xl max-h-[85vh]"
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightbox.imageUrl}
                alt={lightbox.caption || ""}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl"
              />
              {(lightbox.caption || lightbox.staffName) && (
                <div className="mt-3 text-center">
                  {lightbox.caption && <p className="text-white font-semibold">{lightbox.caption}</p>}
                  {lightbox.staffName && <p className="text-white/50 text-sm">by {lightbox.staffName}</p>}
                </div>
              )}
              <button
                onClick={() => setLightbox(null)}
                className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
              >
                ✕
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
