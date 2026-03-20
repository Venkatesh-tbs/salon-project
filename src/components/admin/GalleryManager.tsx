"use client";

import React, { useState, useEffect, useRef } from "react";
import { db, storage } from "@/firebase";
import { ref, push, set, onValue, remove, off } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Plus, Trash2, Link as LinkIcon, Loader2, X, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GalleryImage {
  id?: string;
  imageUrl: string;
  caption: string;
  createdAt: number;
}

type UploadType = "url" | "file";

export function GalleryManager() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>("file");
  const [newImage, setNewImage] = useState({ imageUrl: "", caption: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const galleryDbRef = ref(db, 'gallery');
    const listener = onValue(galleryDbRef, (snapshot) => {
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

    return () => off(galleryDbRef, 'value', listener);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // 1. Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Only JPG, PNG, and WebP images are allowed." });
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewImage({ ...newImage, imageUrl: val });
    setPreview(val);
  };

  const handleImageError = () => {
    if (uploadType === 'url') {
      toast({ variant: "destructive", title: "Invalid URL", description: "The provided image URL could not be loaded." });
      setPreview("");
      setNewImage({ ...newImage, imageUrl: "" });
    }
  };

  const resetForm = () => {
    setNewImage({ imageUrl: "", caption: "" });
    setFile(null);
    setPreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadType === "file" && !file) {
      toast({ variant: "destructive", title: "Error", description: "Please select a file to upload." });
      return;
    }
    if (uploadType === "url" && !newImage.imageUrl) {
      toast({ variant: "destructive", title: "Error", description: "Please provide a valid image URL." });
      return;
    }

    setIsSubmitting(true);
    try {
      let finalUrl = newImage.imageUrl;

      if (uploadType === "file" && file) {
        console.log(`[GalleryUpload] Starting upload for file: ${file.name} (${file.type}, ${file.size} bytes)`);
        const fileExt = file.name.split('.').pop() || 'jpg';
        const imageRef = storageRef(storage, `gallery/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`);
        
        try {
          console.log(`[GalleryUpload] Sending bytes to Firebase Storage path: ${imageRef.fullPath}`);
          const snapshot = await uploadBytes(imageRef, file);
          console.log(`[GalleryUpload] Bytes uploaded successfully. Bytes transferred: ${snapshot.metadata.size}`);
          
          finalUrl = await getDownloadURL(snapshot.ref);
          console.log(`[GalleryUpload] Successfully retrieved download URL: ${finalUrl}`);
        } catch (uploadError: any) {
          console.error(`[GalleryUpload] Firebase Storage Upload Error:`, uploadError);
          throw new Error(`Storage Error: ${uploadError.message || "Ensure Firebase Storage rules allow public or authenticated writes."}`);
        }
      }

      if (!finalUrl) throw new Error("No image URL generated.");

      // Save to Firebase Realtime Database
      const galleryDbRef = ref(db, 'gallery');
      const newRef = push(galleryDbRef);
      await set(newRef, {
        imageUrl: finalUrl,
        caption: newImage.caption,
        createdAt: Date.now()
      });
      
      resetForm();
      setIsAdding(false);
      toast({ title: "Success", description: "Image successfully added to the gallery." });
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Upload Failed", description: err.message || "Failed to process and save image." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gallery image?")) return;
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
          onClick={() => {
            if (isAdding) resetForm();
            setIsAdding(!isAdding);
          }}
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
            <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-2xl border border-white/10 bg-white/[0.04] space-y-6">
              
              <div className="flex bg-black/40 p-1 rounded-xl w-fit border border-white/5">
                <button
                  type="button"
                  onClick={() => { setUploadType("file"); resetForm(); }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${uploadType === "file" ? 'bg-brand-purple text-white' : 'text-white/40 hover:text-white'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => { setUploadType("url"); resetForm(); }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${uploadType === "url" ? 'bg-brand-purple text-white' : 'text-white/40 hover:text-white'}`}
                >
                  Image URL
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_250px] gap-6">
                <div className="space-y-4">
                  
                  {/* File Upload OR URL Input based on selection */}
                  {uploadType === "file" ? (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">Select Image File</label>
                      <div className="relative">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full text-sm text-white/40 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/15 cursor-pointer border border-dashed border-white/10 p-2 rounded-2xl transition-all hover:border-brand-purple/50 bg-black/20"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">Remote Image URL</label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input
                          required
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          value={newImage.imageUrl}
                          onChange={handleUrlChange}
                          className="w-full h-11 bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-purple transition-all"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">Caption (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Modern Fade"
                      value={newImage.caption}
                      onChange={(e) => setNewImage({ ...newImage, caption: e.target.value })}
                      className="w-full h-11 bg-black/20 border border-white/10 rounded-xl px-4 text-white placeholder:text-white/20 focus:outline-none focus:border-brand-purple transition-all"
                    />
                  </div>
                </div>

                {/* Preview Section */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-white/50 uppercase tracking-wider ml-1">Live Preview</label>
                  <div className="aspect-square rounded-2xl border border-white/10 bg-black/40 overflow-hidden flex items-center justify-center relative shadow-inner">
                    {preview ? (
                      <img 
                        src={preview} 
                        onError={handleImageError}
                        alt="Preview" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-white/20">
                        {uploadType === "file" ? <UploadCloud className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
                        <span className="text-xs font-medium">No Image</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-white/5">
                <button
                  type="submit"
                  disabled={isSubmitting || (uploadType === "file" && !file) || (uploadType === "url" && !newImage.imageUrl)}
                  className="px-6 py-2 rounded-xl bg-brand-neon text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save to Gallery"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gallery Grid View */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square rounded-3xl bg-white/5 animate-pulse border border-white/10" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
          <ImageIcon className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-white/40 text-sm font-medium">No images uploaded yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {images.map((img) => (
            <motion.div
              layout
              key={img.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black shadow-xl"
            >
              <img
                src={img.imageUrl}
                alt={img.caption || "Gallery Work"}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              
              {/* Gradient Overlay for Caption & Delete */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-5">
                <p className="text-white text-sm font-bold tracking-wide drop-shadow-md pb-1 border-b border-white/20 mb-3 block">
                  {img.caption || "Salon Showcase"}
                </p>
                <div className="flex justify-between items-center text-[10px] text-white/50 font-mono uppercase tracking-widest">
                  <span>{new Date(img.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => img.id && handleDelete(img.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all backdrop-blur-md"
                    title="Delete Image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
