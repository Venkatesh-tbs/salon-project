"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { useAdminData } from "@/components/admin/AdminDataProvider";

type RevenueStats = {
  todayRevenue: number;
  monthRevenue: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  peakHours: any[];
  revenueByDay: any[];
  bookingsByService: any[];
  topStaff: any[];
};

const STAT_CARDS = (stats: RevenueStats) => [
  {
    label:   "Today's Revenue",
    value:   `₹${stats.todayRevenue.toLocaleString("en-IN")}`,
    icon:    "💰",
    color:   "#10b981",
    sub:     "vs yesterday",
  },
  {
    label:   "Month Revenue",
    value:   `₹${stats.monthRevenue.toLocaleString("en-IN")}`,
    icon:    "📈",
    color:   "#c026d3",
    sub:     "this month",
  },
  {
    label:   "Total Bookings",
    value:   stats.totalBookings,
    icon:    "📅",
    color:   "#7c3aed",
    sub:     `${stats.completedBookings} completed`,
  },
  {
    label:   "Cancelled",
    value:   stats.cancelledBookings,
    icon:    "❌",
    color:   "#ef4444",
    sub:     `${Math.round((stats.cancelledBookings / Math.max(stats.totalBookings, 1)) * 100)}% rate`,
  },
];

const PIE_COLORS = ["#c026d3", "#7c3aed", "#6366f1", "#0891b2", "#059669", "#d97706", "#ef4444", "#ec4899"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a0d2e] px-4 py-3 text-sm shadow-xl">
      <p className="text-white/50 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name === "revenue" ? `₹${Number(p.value).toLocaleString("en-IN")}` : p.value}
        </p>
      ))}
    </div>
  );
};

export const RevenueDashboard: React.FC = () => {
  const { appointments, loadingAppointments: loading } = useAdminData();

  const stats: RevenueStats = React.useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const currentMonthPrefix = today.substring(0, 7);

    // Initial state
    const result: RevenueStats = {
      todayRevenue: 0,
      monthRevenue: 0,
      totalBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      peakHours: [],
      revenueByDay: [],
      bookingsByService: [],
      topStaff: [],
    };

    const hourCount: Record<string, number> = {};
    const serviceMap: Record<string, { count: number; revenue: number }> = {};
    const staffMap: Record<string, { name: string; count: number; revenue: number }> = {};
    const dailyMap: Record<string, { revenue: number; bookings: number }> = {};

    // Get last 30 days for trend chart
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });

    for (const date of last30Days) {
      dailyMap[date] = { revenue: 0, bookings: 0 };
    }

    for (const a of appointments) {
      const isToday = a.date === today;
      const isThisMonth = a.date?.startsWith(currentMonthPrefix);
      const status = a.status?.toLowerCase();

      if (status === "completed") {
         result.totalBookings++;
         result.completedBookings++;
        const price = Number(a.servicePrice) || Number((a as any).totalAmount) || 0;

        if (isToday) result.todayRevenue += price;
        if (isThisMonth) result.monthRevenue += price;

        // Daily trend (all time or filtered by last30Days)
        if (dailyMap[a.date]) {
          dailyMap[a.date].revenue += price;
          dailyMap[a.date].bookings++;
        }

        // Peak hours
        const hr = a.time?.split(":")?.[0] || "00";
        hourCount[hr] = (hourCount[hr] || 0) + 1;

        // Services
        const sn = a.service || "Unknown";
        if (!serviceMap[sn]) serviceMap[sn] = { count: 0, revenue: 0 };
        serviceMap[sn].count++;
        serviceMap[sn].revenue += price;

        // Staff
        const sid = a.staffId || "unassigned";
        if (!staffMap[sid]) staffMap[sid] = { name: a.staffName || "Unassigned", count: 0, revenue: 0 };
        staffMap[sid].count++;
        staffMap[sid].revenue += price;
      } else if (a.status === "cancelled") {
        result.cancelledBookings++;
      }
    }

    // Format output arrays
    result.peakHours = Object.entries(hourCount)
      .map(([hour, count]) => ({ hour: `${hour}:00`, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    result.revenueByDay = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    result.bookingsByService = Object.entries(serviceMap)
      .map(([serviceName, v]) => ({ serviceName, ...v }))
      .sort((a, b) => b.count - a.count);

    result.topStaff = Object.entries(staffMap)
      .map(([staffId, v]) => ({ staffId, staffName: v.name, bookings: v.count, revenue: v.revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return result;
  }, [appointments]);

  if (loading) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[1,2,3,4].map((i) => (
        <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
      ))}
    </div>
  );

  if (!stats) return <p className="text-white/40">Failed to load revenue data.</p>;

  return (
    <div className="space-y-8">

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS(stats).map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-white/10 p-5"
            style={{ background: `${card.color}08` }}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{card.icon}</span>
              <span
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: card.color }}
              />
            </div>
            <p
              className="text-2xl font-black mb-1"
              style={{ color: card.color, fontFamily: "'Syne', sans-serif" }}
            >
              {card.value}
            </p>
            <p className="text-white/40 text-xs">{card.label}</p>
            <p className="text-white/25 text-[10px] mt-0.5">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Revenue trend + bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Area chart — daily revenue */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-white font-bold mb-4 text-sm tracking-wide">Daily Revenue (30 days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stats.revenueByDay}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c026d3" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#c026d3" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={(v) => v.slice(5)}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`}
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#c026d3"
                strokeWidth={2}
                fill="url(#revGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Bar chart — peak hours */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-white font-bold mb-4 text-sm tracking-wide">Peak Hours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.peakHours} barSize={18}>
              <XAxis
                dataKey="hour"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={25}
              />
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                wrapperStyle={{ outline: 'none' }}
                contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
              />
              <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]}>
                {stats.peakHours.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#c026d3" : "#7c3aed"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Services pie + Top staff */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Pie chart — bookings by service */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-white font-bold mb-4 text-sm tracking-wide">Bookings by Service</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie
                  data={stats.bookingsByService}
                  dataKey="count"
                  nameKey="serviceName"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {stats.bookingsByService.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip />} 
                  wrapperStyle={{ outline: 'none' }}
                  contentStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {stats.bookingsByService.slice(0, 5).map((s, i) => (
                <div key={s.serviceName} className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  <span className="text-white/60 truncate">{s.serviceName}</span>
                  <span className="text-white/40 ml-auto">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top staff */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h3 className="text-white font-bold mb-4 text-sm tracking-wide">Top Stylists</h3>
          <div className="space-y-3">
            {stats.topStaff.map((s, i) => (
              <div key={s.staffId} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                >
                  {s.staffName ? s.staffName[0] : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white font-medium">{s.staffName}</span>
                    <span className="text-fuchsia-400 font-bold text-xs">
                      ₹{s.revenue?.toLocaleString("en-IN") || 0}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((s.bookings / Math.max(...stats.topStaff.map(x => x.bookings), 1)) * 100, 100)}%` }}
                      transition={{ duration: 1, delay: i * 0.1, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <span className="text-white/30 text-xs shrink-0">{s.bookings} jobs</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};
