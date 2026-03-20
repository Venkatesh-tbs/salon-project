'use client';

import { useAdminData } from '@/components/admin/AdminDataProvider';
import { Users, Phone, Calendar, Award, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

export function ClientList() {
  const { clients, loadingClients: loading } = useAdminData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-white/10 glass-panel p-8 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
          <Users className="h-10 w-10 text-brand-pink opacity-50" />
        </div>
        <h3 className="text-xl font-heading font-semibold text-white">No Clients Yet</h3>
        <p className="mt-2 text-sm text-white/40 max-w-sm">
          Clients are added automatically when bookings are marked as completed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-heading font-semibold text-white">Client Database</h3>
          <p className="text-sm text-white/40">{clients.length} registered client{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex h-10 items-center justify-center rounded-xl bg-brand-pink/10 border border-brand-pink/20 px-4 text-sm font-semibold text-brand-pink">
          {clients.length} Total
        </div>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {clients.map((client) => (
          <div
            key={client.id}
            className="relative group glass-panel rounded-2xl p-5 border border-white/10 hover:border-brand-purple/30 transition-all duration-300 hover-lift overflow-hidden"
          >
            {/* Glow */}
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand-purple/10 rounded-full blur-2xl group-hover:bg-brand-purple/20 transition-colors pointer-events-none" />

            <div className="relative z-10 flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-purple/30 to-brand-pink/20 border border-white/10 text-white font-heading font-bold text-lg shadow-inner group-hover:shadow-[0_0_15px_rgba(241,7,163,0.3)] transition-all">
                {client.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-white capitalize truncate group-hover:text-brand-neon transition-colors">
                  {client.name}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/40 mt-1">
                  <Phone className="w-3 h-3" />
                  <span>{client.phone}</span>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 p-3">
                <div className="w-7 h-7 rounded-lg bg-brand-purple/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-3.5 h-3.5 text-brand-neon" />
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">Visits</div>
                  <div className="text-base font-heading font-bold text-white">{client.totalVisits}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 p-3">
                <div className="w-7 h-7 rounded-lg bg-brand-pink/20 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-brand-pink" />
                </div>
                <div>
                  <div className="text-[10px] text-white/40 uppercase tracking-wide">Last Visit</div>
                  <div className="text-xs font-heading font-semibold text-white/80">
                    {client.lastVisitDate
                      ? format(new Date(client.lastVisitDate + 'T00:00:00'), 'MMM d')
                      : '–'}
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty badge */}
            {client.totalVisits >= 5 && (
              <div className="absolute top-3 right-3 z-10">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-neon/10 border border-brand-neon/30 px-2 py-0.5 text-[10px] font-bold text-brand-neon uppercase tracking-wide">
                  <Award className="w-3 h-3" /> VIP
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
