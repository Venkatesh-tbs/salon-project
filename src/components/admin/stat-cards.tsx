import { Appointment } from "@/firebase/db";
import { CalendarDays, Users, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface StatCardsProps {
  appointments: Appointment[];
}

export function StatCards({ appointments }: StatCardsProps) {
  const todayStr = new Date().toISOString().split("T")[0];

  const todaysBookings = appointments.filter(a => a.date === todayStr && a.status === 'completed').length;
  const totalBookings = appointments.filter(a => a.status === 'completed').length;
  const pendingCount = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  // --- Analytics Logic ---
  const validBookings = appointments.filter(a => a.status !== 'cancelled');
  const hourCounts: Record<string, number> = {};
  const dayCounts: Record<string, number> = {};
  const staffCounts: Record<string, number> = {};

  validBookings.forEach(a => {
    // Peak Hour Insight
    if (a.time) {
      const hour = parseInt(a.time.split(':')[0] || '0', 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const h12 = hour % 12 || 12;
      const key = `${h12} ${ampm}`;
      hourCounts[key] = (hourCounts[key] || 0) + 1;
    }
    // Busiest Day Insight
    if (a.date) {
      const d = new Date(a.date);
      if (!isNaN(d.getTime())) {
        const dayStr = d.toLocaleDateString('en-US', { weekday: 'long' });
        dayCounts[dayStr] = (dayCounts[dayStr] || 0) + 1;
      }
    }
    // Top Staff Insight
    if (a.staffEmail || a.staffId) {
      const identifier = a.staffEmail ? a.staffEmail.split('@')[0] : (a.staffId || 'Unassigned');
      const capitalized = identifier.charAt(0).toUpperCase() + identifier.slice(1);
      staffCounts[capitalized] = (staffCounts[capitalized] || 0) + 1;
    }
  });

  const getTop = (record: Record<string, number>) => {
    let max = 0;
    let topKey = '';
    for (const [k, v] of Object.entries(record)) {
      if (v > max) { max = v; topKey = k; }
    }
    return topKey;
  };

  const peakHour = getTop(hourCounts) || 'N/A';
  const busiestDay = getTop(dayCounts) || 'N/A';
  const topStaff = getTop(staffCounts) || 'N/A';
  const successRate = totalBookings > 0 ? Math.round((completedCount / (totalBookings + pendingCount)) * 100) : 100;

  const cards = [
    {
      label: "Today's Bookings",
      value: todaysBookings,
      insight: `Peak Flow: ${peakHour}`,
      icon: CalendarDays,
      colorFrom: 'brand-purple',
      glow: 'rgba(123,47,247,0.15)',
      glowHover: 'rgba(123,47,247,0.3)',
      iconColor: 'text-brand-neon',
      bgBlob: 'brand-purple/20',
      bgBlobHover: 'brand-purple/30',
      borderColor: 'brand-purple/20',
    },
    {
      label: 'Total Bookings',
      value: totalBookings,
      insight: `Busiest: ${busiestDay}`,
      icon: Users,
      colorFrom: 'brand-pink',
      glow: 'rgba(241,7,163,0.15)',
      glowHover: 'rgba(241,7,163,0.3)',
      iconColor: 'text-brand-pink',
      bgBlob: 'brand-pink/20',
      bgBlobHover: 'brand-pink/30',
      borderColor: 'brand-pink/20',
    },
    {
      label: 'Pending / Upcoming',
      value: pendingCount,
      insight: `Top Stylist: ${topStaff}`,
      icon: Clock,
      colorFrom: 'yellow-500',
      glow: 'rgba(234,179,8,0.15)',
      glowHover: 'rgba(234,179,8,0.3)',
      iconColor: 'text-yellow-400',
      bgBlob: 'yellow-500/20',
      bgBlobHover: 'yellow-500/30',
      borderColor: 'yellow-500/20',
    },
    {
      label: 'Completed',
      value: completedCount,
      insight: `${successRate}% Success Rate`,
      icon: CheckCircle,
      colorFrom: 'teal-500',
      glow: 'rgba(20,184,166,0.15)',
      glowHover: 'rgba(20,184,166,0.3)',
      iconColor: 'text-teal-400',
      bgBlob: 'teal-500/20',
      bgBlobHover: 'teal-500/30',
      borderColor: 'teal-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="relative group rounded-2xl glass-card p-5 hover-lift overflow-hidden transition-all duration-300"
          >
            <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${card.bgBlob} rounded-full blur-2xl group-hover:bg-${card.bgBlobHover} transition-colors`} />
            <div className="relative flex items-start justify-between z-10">
              <div>
                <p className="text-xs font-medium text-white/50 tracking-wide uppercase leading-tight">{card.label}</p>
                <h3 className="mt-2 text-4xl font-heading font-bold text-white tracking-tight">{card.value}</h3>
                <p className={`mt-2 text-[10px] font-bold tracking-widest uppercase ${card.iconColor} opacity-80`}>{card.insight}</p>
              </div>
              <div
                className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-${card.colorFrom}/20 to-${card.colorFrom}/5 border border-${card.borderColor} transition-all`}
                style={{ boxShadow: `0 0 15px ${card.glow}` }}
              >
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
