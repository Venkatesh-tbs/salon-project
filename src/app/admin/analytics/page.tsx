'use client';

import { useAdminData } from "@/components/admin/AdminDataProvider";
import { RevenueDashboard } from "@/components/admin/RevenueDashboard";
import { StaffAnalytics } from "@/components/admin/StaffAnalytics";
import { CRMTable } from "@/components/admin/CRMTable";

export default function AdminAnalyticsPage() {
  const { appointments } = useAdminData();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight glow-text pb-1">Analytics & Reporting</h2>
        <p className="text-sm text-zinc-400 mt-1">Deep dive into revenue, staff performance, and clients.</p>
      </div>

      <div className="space-y-12">
        <RevenueDashboard />
        
        <div className="pt-8 border-t border-white/10">
          <StaffAnalytics appointments={appointments} />
        </div>

        <div className="pt-8 border-t border-white/10">
           <h3 className="text-2xl font-heading font-semibold mb-6">Clients CRM</h3>
          <CRMTable />
        </div>
      </div>
    </div>
  );
}
