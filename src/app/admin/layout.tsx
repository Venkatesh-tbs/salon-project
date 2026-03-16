import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#040406] overflow-hidden font-sans text-slate-50 selection:bg-brand-purple/30">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle global dashboard backgrounds */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-brand-pink/5 rounded-full blur-[150px] pointer-events-none"></div>
        {children}
      </main>
    </div>
  );
}
