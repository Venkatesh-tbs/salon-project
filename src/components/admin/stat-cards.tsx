import { Appointment } from "@/firebase/db";
import { CalendarDays, Users, Clock, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface StatCardsProps {
  appointments: Appointment[];
}

export function StatCards({ appointments }: StatCardsProps) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const todaysBookings = appointments.filter(a => a.date === todayStr).length;
  const totalBookings = appointments.length;
  const pendingCount = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;

  const cards = [
    {
      label: "Today's Bookings",
      value: todaysBookings,
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
