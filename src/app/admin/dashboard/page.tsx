'use client';

import { useAdminData } from "@/components/admin/AdminDataProvider";

import { StatCards } from "@/components/admin/stat-cards";
import { AiSummaryCard } from "@/components/admin/ai-summary-card";
import { AppointmentsTable } from "@/components/admin/appointments-table";
import { ActivityTimeline } from "@/components/admin/activity-timeline";
import { RecentClients } from "@/components/admin/recent-clients";

export default function AdminDashboardPage() {
  const { appointments, loadingAppointments: loading } = useAdminData();

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight glow-text pb-1">Overview</h2>
        <p className="text-sm text-zinc-400 mt-1">Real-time metrics and booking overview.</p>
      </div>

      <StatCards appointments={appointments} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-heading font-semibold tracking-wide">Recent Appointments</h3>
            <span className="text-xs text-zinc-400">{appointments.length} total</span>
          </div>
          <AppointmentsTable appointments={appointments} isLoading={loading} />
        </div>
        <div className="xl:col-span-1 space-y-6">
          <AiSummaryCard appointments={appointments} />
          <ActivityTimeline appointments={appointments} />
          <RecentClients appointments={appointments} />
        </div>
      </div>
    </div>
  );
}
