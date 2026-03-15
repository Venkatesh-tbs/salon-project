import { Appointment } from "@/firebase/db";
import { Users, ArrowUpRight } from "lucide-react";

export function RecentClients({ appointments }: { appointments: Appointment[] }) {
  // Filter for unique clients
  const uniqueClients = Array.from(new Map(appointments.map(item => [item.name.toLowerCase().trim(), item])).values()).slice(0, 4);

  return (
    <div className="glass-panel p-6 rounded-2xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-pink" />
          Recent Clients
        </h3>
        <button className="text-xs font-medium text-brand-neon hover:text-white transition-colors flex items-center gap-1">
          View All <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex-1 space-y-4">
        {uniqueClients.length === 0 ? (
          <p className="text-sm text-white/50">No clients in database.</p>
        ) : (
          uniqueClients.map((client) => (
            <div key={client.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-purple/20 to-brand-pink/20 text-white font-medium shadow-inner group-hover:shadow-[0_0_15px_rgba(241,7,163,0.3)] transition-all">
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="font-medium text-white/90 truncate capitalize">{client.name}</div>
                <div className="text-xs text-white/40 truncate">{client.phone}</div>
              </div>
              <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 text-white/60 border border-white/10 group-hover:bg-brand-purple/20 group-hover:text-brand-pink group-hover:border-brand-purple/30 transition-all capitalize">
                {client.service.split(' ')[0]}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
