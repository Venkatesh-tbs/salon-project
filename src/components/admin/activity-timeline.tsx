import { Appointment } from "@/firebase/db";
import { CheckCircle2, Clock } from "lucide-react";

export function ActivityTimeline({ appointments }: { appointments: Appointment[] }) {
  // Take the 4 most recent appointments
  const recentFeed = appointments.slice(0, 4);

  return (
    <div className="glass-panel p-6 rounded-2xl">
      <h3 className="text-lg font-heading font-semibold text-white mb-6 flex items-center gap-2">
        <Clock className="w-5 h-5 text-brand-neon" />
        Booking Activity
      </h3>
      
      <div className="space-y-4">
        {recentFeed.length === 0 ? (
          <p className="text-sm text-white/50">No recent activity detected.</p>
        ) : (
          <div className="relative border-l border-white/10 ml-3 space-y-4">
            {recentFeed.map((appt, i) => (
              <div key={appt.id} className="relative pl-6">
                <span className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full bg-brand-purple border-2 border-[#0F0F13] ring-2 ring-brand-purple/30 glow-border"></span>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/90">New booking from {appt.name}</span>
                    <span className="text-xs text-brand-pink tracking-wider">
                      {new Date(appt.createdAt || Date.now()).toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                  <p className="text-sm text-white/50">Scheduled for {appt.service} at {appt.time}.</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
