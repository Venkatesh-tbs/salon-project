"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/firebase";
import { ref, onValue, off } from "firebase/database";
import { motion } from "framer-motion";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

interface GalleryImage {
  id: string;
  imageUrl: string;
  caption: string;
}

export function GallerySection() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const galleryRef = ref(db, 'gallery');
    const listener = onValue(galleryRef, (snapshot) => {
      if (!snapshot.exists()) {
        setImages([]);
      } else {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).sort((a, b) => b.createdAt - a.createdAt);
        setImages(list);
      }
      setLoading(false);
    });

    return () => off(galleryRef, 'value', listener);
  }, []);

  if (!loading && images.length === 0) return null;

  return (
    <section id="gallery" className="py-24 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-brand-purple/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-brand-pink/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mb-16 px-4 md:px-0">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-3 text-brand-neon font-heading font-bold text-sm uppercase tracking-[0.2em] mb-4"
          >
            <span className="w-8 h-[1px] bg-brand-neon" />
            Portfolios
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 leading-tight"
          >
            Artistry in <span className="bg-gradient-to-r from-brand-purple to-brand-pink bg-clip-text text-transparent italic">Every Cut</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-white/50 text-lg"
          >
            Explore our latest transformations, barber styles, and the premium atmosphere of Salon Luxe.
          </motion.p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-3xl bg-white/5 animate-pulse border border-white/10" />
            ))}
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6 px-4 md:px-0">
            {images.map((img, i) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="relative break-inside-avoid rounded-3xl overflow-hidden border border-white/10 glass-panel group shadow-2xl"
              >
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={img.imageUrl}
                    alt={img.caption}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                  <p className="text-white text-sm font-medium leading-relaxed scale-95 group-hover:scale-100 transition-transform duration-300 transform-gpu origin-bottom">
                    {img.caption}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
