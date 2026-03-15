"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/firebase";
import { ref, push, set, onValue, remove, off } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Plus, Trash2, Link as LinkIcon, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GalleryImage {
  id?: string;
  imageUrl: string;
  caption: string;
  createdAt: number;
}

export function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newImage, setNewImage] = useState({ imageUrl: "", caption: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newImage.imageUrl) return;

    setIsSubmitting(true);
    try {
      const galleryRef = ref(db, 'gallery');
      const newRef = push(galleryRef);
      await set(newRef, {
        ...newImage,
        createdAt: Date.now()
      });
      setNewImage({ imageUrl: "", caption: "" });
      setIsAdding(false);
      toast({ title: "Success", description: "Image added to gallery." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to add image." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this gallery image?")) return;
    try {
      await remove(ref(db, `gallery/${id}`));
      toast({ title: "Deleted", description: "Image removed from gallery." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete image." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold text-white tracking-wide">Gallery Manager</h2>
          <p className="text-sm text-white/40">Manage images shown on the public website.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-purple text-white text-sm font-semibold hover:bg-brand-purple/80 transition-all shadow-lg shadow-brand-purple/20"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAdding ? "Cancel" : "Add Image"}
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/[0.04] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">Image URL</label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      required
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={newImage.imageUrl}
                      onChange={(e) => setNewImage({ ...newImage, imageUrl: e.target.value })}
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-purple transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">Caption</label>
                  <input
                    type="text"
                    placeholder="e.g. Modern Mullet Cut"
                    value={newImage.caption}
                    onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-purple transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-brand-neon text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save to Gallery"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse border border-white/10" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
          <ImageIcon className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-white/40 text-sm">No images in your gallery yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img) => (
            <motion.div
              layout
              key={img.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-white/5"
            >
              <img
                src={img.imageUrl}
                alt={img.caption}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                <p className="text-white text-xs font-medium mb-2 line-clamp-2">{img.caption}</p>
                <button
                  onClick={() => img.id && handleDelete(img.id)}
                  className="self-end p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
