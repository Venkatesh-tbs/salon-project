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
    <div className="space-y-6 p-6 md:p-8">
      {/* ── Page Title ── */}
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight glow-text pb-1">Overview</h2>
        <p className="text-sm text-zinc-400 mt-1">Real-time metrics and booking overview.</p>
      </div>

      {/* ── Row 1: Stat Cards ── */}
      <StatCards appointments={appointments} />

      {/* ── Row 2: Appointments + AI (side by side, capped height) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent Appointments — 2-col wide, internal scroll */}
        <div className="xl:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-heading font-semibold tracking-wide">Recent Appointments</h3>
            <span className="text-xs text-zinc-400">{appointments.length} total</span>
          </div>
          {/* Scrollable container capped at ~4 rows */}
          <div className="overflow-y-auto" style={{ maxHeight: '360px' }}>
            <AppointmentsTable appointments={appointments} isLoading={loading} />
          </div>
        </div>

        {/* Aura AI — compact, no unbounded stretch */}
        <div className="xl:col-span-1">
          <AiSummaryCard appointments={appointments} />
        </div>
      </div>

      {/* ── Row 3: Recent Clients + Booking Activity side by side ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentClients appointments={appointments} />
        <ActivityTimeline appointments={appointments} />
      </div>
    </div>
  );
}
