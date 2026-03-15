// ============================================================
// frontend/src/components/admin/GalleryManager.tsx
// ============================================================
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { galleryService } from "../../services/api";
import type { GalleryItem } from "../../types";

const CATEGORIES = [
  { id: "all",         label: "All",         icon: "🖼️" },
  { id: "haircut",     label: "Haircut",     icon: "✂️" },
  { id: "color",       label: "Color",       icon: "🎨" },
  { id: "beforeafter", label: "Before/After",icon: "🔄" },
  { id: "portfolio",   label: "Portfolio",   icon: "👤" },
  { id: "salon",       label: "Salon",       icon: "🏛️" },
];

export const GalleryManager: React.FC = () => {
  const [items, setItems]       = useState<GalleryItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview]   = useState<string | null>(null);
  const fileRef                 = useRef<HTMLInputElement>(null);
  const [uploadForm, setUploadForm] = useState({ caption: "", category: "salon", staffName: "" });

  const load = () => {
    setLoading(true);
    const cat = activeTab === "all" ? undefined : activeTab;
    galleryService.getAll(cat).then(setItems).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTab]); // eslint-disable-line

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !preview) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("image",     file);
    fd.append("category",  uploadForm.category);
    fd.append("caption",   uploadForm.caption);
    fd.append("staffName", uploadForm.staffName);
    try {
      await galleryService.upload(fd);
      setPreview(null);
      setUploadForm({ caption: "", category: "salon", staffName: "" });
      if (fileRef.current) fileRef.current.value = "";
      load();
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Remove this image from gallery?")) return;
    await galleryService.remove(itemId);
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
            Gallery Manager
          </h2>
          <p className="text-white/40 text-sm">{items.length} images</p>
        </div>

        {/* Upload trigger */}
        <button
          onClick={() => fileRef.current?.click()}
          className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm"
          style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)" }}
        >
          + Upload Image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Upload panel */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="mb-6 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/[0.05] p-5"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="flex flex-col sm:flex-row gap-5">
              <img src={preview} alt="preview" className="w-32 h-32 object-cover rounded-xl border border-white/10 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-white/40 text-xs block mb-1">Category</label>
                    <select
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none"
                      style={{ colorScheme: "dark" }}
                    >
                      {CATEGORIES.filter((c) => c.id !== "all").map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#1a0d2e]">{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-white/40 text-xs block mb-1">Stylist (optional)</label>
                    <input
                      type="text"
                      placeholder="Rahul"
                      value={uploadForm.staffName}
                      onChange={(e) => setUploadForm((f) => ({ ...f, staffName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none placeholder:text-white/20 focus:border-fuchsia-600 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-white/40 text-xs block mb-1">Caption</label>
                  <input
                    type="text"
                    placeholder="Short description…"
                    value={uploadForm.caption}
                    onChange={(e) => setUploadForm((f) => ({ ...f, caption: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm outline-none placeholder:text-white/20 focus:border-fuchsia-600 transition-all"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                    className="px-4 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-6 py-2 rounded-xl font-semibold text-white text-sm disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, #c026d3, #7c3aed)" }}
                  >
                    {uploading ? "Uploading…" : "Upload →"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className="px-4 py-2 rounded-xl text-sm font-medium border transition-all"
            style={{
              borderColor: activeTab === cat.id ? "#c026d3" : "rgba(255,255,255,0.1)",
              background:  activeTab === cat.id ? "rgba(192,38,211,0.15)" : "transparent",
              color:       activeTab === cat.id ? "#e879f9" : "rgba(255,255,255,0.5)",
            }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Image grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-white/30">
          <p className="text-4xl mb-3">🖼️</p>
          <p>No images in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item, i) => (
            <motion.div
              key={item.itemId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10"
            >
              <img
                src={item.imageUrl}
                alt={item.caption || "gallery"}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                <button
                  onClick={() => handleDelete(item.itemId)}
                  className="self-end w-8 h-8 rounded-full bg-red-500/80 flex items-center justify-center text-white text-xs hover:bg-red-500 transition-all"
                >
                  ✕
                </button>
                <div>
                  {item.caption && (
                    <p className="text-white text-xs font-medium truncate">{item.caption}</p>
                  )}
                  {item.staffName && (
                    <p className="text-white/50 text-[10px]">by {item.staffName}</p>
                  )}
                  <span
                    className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-semibold capitalize"
                    style={{ background: "rgba(192,38,211,0.3)", color: "#e879f9" }}
                  >
                    {item.category}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
