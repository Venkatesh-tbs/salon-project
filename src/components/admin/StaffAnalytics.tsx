"use client";

import React, { useMemo } from "react";
import { Appointment } from "@/firebase/db";
import { motion } from "framer-motion";
import { User, CheckCircle2, TrendingUp, Calendar } from "lucide-react";

interface StaffAnalyticsProps {
  appointments: Appointment[];
}

interface StaffStats {
  staffName: string;
  totalBookings: number;
  completedBookings: number;
  revenueGenerated: number;
}

export const StaffAnalytics: React.FC<StaffAnalyticsProps> = ({ appointments }) => {
  const staffStats = useMemo(() => {
    const statsMap: Record<string, StaffStats> = {};

    appointments.forEach((appt) => {
      const staffName = appt.staffName || "Unassigned";
      
      if (!statsMap[staffName]) {
        statsMap[staffName] = {
          staffName,
          totalBookings: 0,
          completedBookings: 0,
          revenueGenerated: 0,
        };
      }

      statsMap[staffName].totalBookings += 1;
      
      if (appt.status === "completed") {
        statsMap[staffName].completedBookings += 1;
        statsMap[staffName].revenueGenerated += Number(appt.servicePrice || 0);
      }
    });

    const staffArray = Object.values(statsMap);
    const sortedStaff = staffArray.sort((a: StaffStats, b: StaffStats) => {
      const rateA = a.totalBookings > 0 ? a.completedBookings / a.totalBookings : 0;
      const rateB = b.totalBookings > 0 ? b.completedBookings / b.totalBookings : 0;
      return rateB - rateA;
    });

    let maxEff = -1;
    let minEff = 200;
    
    // Bounds check
    sortedStaff.forEach(s => {
      if (s.totalBookings > 0) {
        const eff = s.completedBookings / s.totalBookings;
        if (eff > maxEff) maxEff = eff;
        if (eff < minEff) minEff = eff;
      }
    });

    return sortedStaff.map(stat => {
      let badge = "";
      if (sortedStaff.length > 1 && stat.totalBookings > 0) {
        const eff = stat.completedBookings / stat.totalBookings;
        if (eff === maxEff) badge = " 👑 Top Performer";
        else if (eff === minEff && eff < maxEff) badge = " ⚠️ Needs Attention";
      }
      return { ...stat, staffName: `${stat.staffName}${badge}` };
    });
  }, [appointments]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-heading font-semibold text-white tracking-wide">Staff Performance</h2>
        <p className="text-sm text-white/40">Performance metrics calculated from all-time appointments.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Staff", value: staffStats.length, icon: User, color: "text-blue-400" },
          { label: "Completion Rate", value: `100%`, icon: CheckCircle2, color: "text-green-400" },
          { label: "Total Revenue", value: `₹${appointments.reduce((sum, a) => sum + (a.status?.toLowerCase() === 'completed' ? (Number(a.servicePrice) || Number((a as any).totalAmount) || 0) : 0), 0).toLocaleString()}`, icon: TrendingUp, color: "text-fuchsia-400" },
          { label: "Total Bookings", value: appointments.filter(a => a.status?.toLowerCase() === 'completed').length, icon: Calendar, color: "text-brand-purple" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel p-4 rounded-2xl border border-white/10 bg-white/[0.02] flex items-center gap-4"
          >
            <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white/40 text-xs font-medium uppercase tracking-wider">{stat.label}</p>
              <p className="text-xl font-bold text-white mt-0.5">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel overflow-hidden border border-white/10 rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-white/70">
            <thead className="bg-white/[0.03] text-xs uppercase text-white/40 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Staff Name</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Total Bookings</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Completed</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Revenue</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Consistency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {staffStats.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-white/30">
                    No staff performance data available.
                  </td>
                </tr>
              ) : (
                staffStats.map((stat, i) => {
                  const rate = Math.round((stat.completedBookings / (stat.totalBookings || 1)) * 100);
                  return (
                    <motion.tr
                      key={stat.staffName}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-purple/40 to-brand-pink/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                            {stat.staffName.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-white">{stat.staffName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-white/80">{stat.totalBookings}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-green-400 font-medium">{stat.completedBookings}</span>
                          <span className="text-[10px] text-white/20 uppercase tracking-tighter">({rate}%)</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-fuchsia-400 font-bold">₹{stat.revenueGenerated.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rate}%` }}
                            transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                            className={`h-full rounded-full ${rate > 80 ? 'bg-green-400' : rate > 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
