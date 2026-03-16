import { GalleryManager } from "@/components/admin/GalleryManager";

export default function AdminServicesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight glow-text pb-1">Services & Gallery</h2>
        <p className="text-sm text-zinc-400 mt-1">Manage salon services and public gallery.</p>
      </div>

      <GalleryManager />
    </div>
  );
}
