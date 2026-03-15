"use client";

import { useEffect, useState } from "react";
import { Plus, Bell, Search, LayoutDashboard, CalendarDays, Users, TrendingUp, UserCog, Image as ImageIcon } from "lucide-react";
import { Appointment, subscribeToAppointments } from "@/firebase/db";
import { db } from "@/firebase";

import { StatCards } from "@/components/admin/stat-cards";
import { AiSummaryCard } from "@/components/admin/ai-summary-card";
import { AppointmentsTable } from "@/components/admin/appointments-table";
import { ActivityTimeline } from "@/components/admin/activity-timeline";
import { RecentClients } from "@/components/admin/recent-clients";
import { CalendarView } from "@/components/admin/calendar-view";
import { CRMTable } from "@/components/admin/CRMTable";
import { RevenueDashboard } from "@/components/admin/RevenueDashboard";
import { StaffManager } from "@/components/admin/StaffManager";
import { StaffAnalytics } from "@/components/admin/StaffAnalytics";
import { GalleryManager } from "@/components/admin/GalleryManager";

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AppointmentForm } from "@/components/dashboard/appointment-form";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Tab = 'overview' | 'revenue' | 'calendar' | 'clients' | 'staff' | 'analytics' | 'gallery';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'clients', label: 'Clients CRM', icon: Users },
  { id: 'staff', label: 'Staff', icon: UserCog },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'gallery', label: 'Gallery', icon: ImageIcon },
];

function DashboardContent() {
  const searchParams = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Handle tab from query param
  useEffect(() => {
    const tab = searchParams.get('tab') as Tab;
    if (tab && TABS.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Real-time RTDB subscription
  useEffect(() => {
    const unsubscribe = subscribeToAppointments(db, (data) => {
      setAppointments(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="flex h-full flex-col font-sans relative z-10">
      {/* ── Top Header ── */}
      <header className="flex h-20 items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-3xl px-8 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-heading font-semibold text-white tracking-wide">Command Center</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-brand-neon transition-colors" />
            <input
              type="text"
              placeholder="Search clients, services..."
              className="h-10 w-64 rounded-full bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all shadow-inner"
            />
          </div>

          <button className="relative text-white/60 hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-brand-pink border-2 border-[#040406]" />
          </button>

          <div className="flex items-center gap-3 pl-6 border-l border-white/10">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-white">Admin User</div>
              <div className="text-xs text-white/50">Manager</div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple to-brand-pink text-sm font-medium text-white shadow-[0_0_15px_rgba(241,7,163,0.3)] ring-2 ring-white/10 relative overflow-hidden">
              <span className="relative z-10">AD</span>
              <div className="absolute inset-0 bg-white/20 blur-sm mix-blend-overlay" />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-[1400px] space-y-8">

          {/* ── Page Title + New Booking Button ── */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-heading font-bold text-white tracking-tight glow-text pb-1">Overview</h2>
              <p className="text-sm text-white/50 mt-1">Real-time metrics and booking management.</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Real-time indicator */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Live
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <button className="group relative flex h-11 items-center justify-center gap-2 rounded-xl px-6 font-heading font-semibold text-white overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(123,47,247,0.3)]">
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-purple to-brand-pink" />
                    <div className="absolute inset-0 bg-gradient-to-r from-brand-pink to-brand-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative z-10 flex items-center gap-2 drop-shadow-md">
                      <Plus className="h-5 w-5" />
                      New Booking
                    </div>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-transparent border-none shadow-2xl">
                  <AppointmentForm onSuccess={() => setIsDialogOpen(false)} />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── Stats (always visible) ── */}
          <StatCards appointments={appointments} />

          {/* ── Tab Navigation ── */}
          <div className="flex items-center gap-2 border-b border-white/10">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
                    active
                      ? 'border-brand-purple text-white'
                      : 'border-transparent text-white/40 hover:text-white/70 hover:border-white/20'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${active ? 'text-brand-neon' : 'text-white/30 group-hover:text-white/60'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab: Overview ── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-heading font-semibold text-white tracking-wide">Recent Appointments</h3>
                  <span className="text-xs text-white/40">{appointments.length} total</span>
                </div>
                <AppointmentsTable appointments={appointments} isLoading={loading} />
              </div>
              <div className="xl:col-span-1 space-y-6">
                <AiSummaryCard appointments={appointments} />
                <ActivityTimeline appointments={appointments} />
                <RecentClients appointments={appointments} />
              </div>
            </div>
          )}

          {/* ── Tab: Calendar ── */}
          {activeTab === 'calendar' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-heading font-semibold text-white">Calendar View</h3>
                <p className="text-sm text-white/40 mt-1">All appointments by date and time</p>
              </div>
              <CalendarView appointments={appointments} />
            </div>
          )}

          {/* ── Tab: Revenue ── */}
          {activeTab === 'revenue' && (
            <RevenueDashboard />
          )}

          {/* ── Tab: Staff ── */}
          {activeTab === 'staff' && (
            <StaffManager />
          )}

          {/* ── Tab: Clients ── */}
          {activeTab === 'clients' && (
            <CRMTable />
          )}

          {/* ── Tab: Analytics ── */}
          {activeTab === 'analytics' && (
            <StaffAnalytics appointments={appointments} />
          )}

          {/* ── Tab: Gallery ── */}
          {activeTab === 'gallery' && (
            <GalleryManager />
          )}

        </div>
      </main>
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-[#040406]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-purple border-t-transparent"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
