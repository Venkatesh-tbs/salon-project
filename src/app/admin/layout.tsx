import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminDataProvider } from "@/components/admin/AdminDataProvider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminDataProvider>
      <div className="flex flex-col md:flex-row h-screen bg-[#040406] overflow-hidden font-sans text-slate-50 selection:bg-brand-purple/30">
        <AdminSidebar />
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto relative">
          {/* Subtle global dashboard backgrounds */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-purple/5 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-brand-pink/5 rounded-full blur-[150px] pointer-events-none"></div>
          <div className="w-full flex-1 md:p-6 p-3">
             {children}
          </div>
        </main>
      </div>
    </AdminDataProvider>
  );
}
