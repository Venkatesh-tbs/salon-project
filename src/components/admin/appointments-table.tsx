'use client';

import { useState, useEffect } from "react";
import { Appointment, AppointmentStatus, deleteAppointmentRTDB } from "@/firebase/db";
import { db } from "@/firebase";
import { ref, update } from "firebase/database";
import { format } from "date-fns";
import { 
  Clock, XCircle, Trash2, User, Phone, Calendar, Tag, 
  ChevronRight, Loader2, CheckCheck, UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { staffService } from "@/services/api";

interface AppointmentsTableProps {
  appointments: Appointment[];
  isLoading?: boolean;
  staffView?: boolean;
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; dotClass: string; badgeClass: string }> = {
  pending: {
    label: 'Pending',
    dotClass: 'bg-yellow-400',
    badgeClass: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400',
  },
  confirmed: {
    label: 'Confirmed',
    dotClass: 'bg-blue-400',
    badgeClass: 'border-blue-400/30 bg-blue-400/10 text-blue-400',
  },
  completed: {
    label: 'Completed',
    dotClass: 'bg-green-400',
    badgeClass: 'border-green-400/30 bg-green-400/10 text-green-400',
  },
  cancelled: {
    label: 'Cancelled',
    dotClass: 'bg-red-400',
    badgeClass: 'border-red-400/30 bg-red-400/10 text-red-400',
  },
};

export function AppointmentsTable({ appointments, isLoading = false, staffView = false }: AppointmentsTableProps) {
  const { toast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);
  const [staffList, setStaffList] = useState<{ staffId: string; name: string; email?: string }[]>([]);

  useEffect(() => {
    if (!staffView) {
      staffService.getAll().then((s) => setStaffList(s)).catch(() => {});
    }
  }, [staffView]);

  const handleAssignStaff = async (apptId: string, staffId: string) => {
    const staff = staffList.find((s) => s.staffId === staffId);
    const apptRef = ref(db, `appointments/${apptId}`);
    // IMPORTANT: staffEmail must be updated when reassigned so the old staff dashboard stops showing it
    await update(apptRef, { 
      staffId, 
      staffName: staff?.name || '',
      staffEmail: staff?.email || ''
    });
    toast({ title: 'Staff Assigned', description: `${staff?.name || 'Staff'} assigned to booking.` });
  };

  const handleStatusChange = async (appointment: Appointment, status: AppointmentStatus) => {
    const apptId = appointment.id;
    if (!apptId) {
      toast({ variant: "destructive", title: "Error", description: "Appointment ID is missing." });
      return;
    }

    if (status === 'completed') {
      if (appointment.date && appointment.time) {
        const now = new Date();
        const [year, month, day] = appointment.date.split('-').map(Number);
        const [hour, minute] = appointment.time.split(':').map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const durationMins = appointment.serviceDuration || 30;
        const endTime = new Date(start.getTime() + durationMins * 60_000);

        if (now < endTime) {
          toast({ variant: "destructive", title: "Action Prevented", description: "Service not completed yet. Please wait until end time." });
          return;
        }
      }
    }

    setLoadingId(apptId + status);
    try {
      // Direct Firebase update — no API route involved, guaranteed to have the correct id
      const apptRef = ref(db, `appointments/${apptId}`);
      await update(apptRef, { status, updatedAt: Date.now() });

      // Push real-time notification for key status changes
      if (status === 'cancelled' || status === 'confirmed' || status === 'completed') {
        const { push: rtdbPush } = await import('firebase/database');
        const notifType = status === 'cancelled' ? 'CANCEL' : status === 'confirmed' ? 'CONFIRMED' : 'COMPLETED';
        const notifMsg =
          status === 'cancelled'
            ? `Booking cancelled for ${appointment.name}`
            : status === 'confirmed'
            ? `Booking confirmed for ${appointment.name} — ${appointment.service}`
            : `Session completed for ${appointment.name}`;

        await rtdbPush(ref(db, 'notifications'), {
          type: notifType,
          message: notifMsg,
          createdAt: Date.now(),
          read: false,
          staffId: appointment.staffId || null,
        }).catch(err => console.error('[Notifications] Failed to push:', err));
      }

      if (status === 'confirmed') {
        fetch('/api/send-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: appointment.phone,
            name: appointment.name,
            service: appointment.service,
            date: appointment.date,
            time: appointment.time
          })
        }).catch(err => console.error('[Twilio] Confirmation trigger failed', err));
      }

      // If completing the appointment, also update loyalty points directly
      if (status === 'completed' && appointment.phone) {
        const digits = appointment.phone.replace(/[\s\-().]/g, '');
        let e164 = digits;
        if (digits.length === 10) e164 = '+91' + digits;
        else if (digits.startsWith('91') && digits.length === 12) e164 = '+' + digits;
        else if (!digits.startsWith('+')) e164 = '+' + digits;
        const phoneId = e164.replace('+', '');

        const { ref: dbRef, get, update: dbUpdate } = await import('firebase/database');
        const clientRef = dbRef(db, `clients/${phoneId}`);
        const snap = await get(clientRef);
        const client = snap.exists() ? snap.val() : { loyaltyPoints: 0, totalVisits: 0, totalSpent: 0 };
        const price = Number(appointment.servicePrice) || Number((appointment as any).totalAmount) || 0;
        await dbUpdate(clientRef, {
          name: appointment.name,
          phone: e164,
          loyaltyPoints: (client.loyaltyPoints || 0) + (price > 500 ? 10 : 5),
          totalVisits: (client.totalVisits || 0) + 1,
          totalSpent: (client.totalSpent || 0) + price,
          lastVisit: Date.now(),
        });
      }

      toast({ 
        title: "Status Updated", 
        description: `Appointment marked as ${status}.` 
      });
    } catch (err: any) {
      console.error('[Status Change Error]:', err);
      toast({ 
        variant: "destructive", 
        title: "Error", 
        description: err.message || "Failed to update status." 
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadingId(id + 'delete');
    try {
      await deleteAppointmentRTDB(db, id);
      toast({ title: "Deleted", description: "Appointment removed." });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete." });
    } finally {
      setLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl overflow-hidden border border-white/10">
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-white/10 rounded w-1/4" />
                <div className="h-3 bg-white/5 rounded w-1/3" />
              </div>
              <div className="w-24 h-8 bg-white/10 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-2xl border border-white/10 glass-panel p-8 text-center">
        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-white/10">
          <Clock className="h-10 w-10 text-brand-purple opacity-50" />
        </div>
        <h3 className="text-xl font-heading font-semibold text-white">Awaiting Appointments</h3>
        <p className="mt-2 text-sm text-white/40 max-w-sm">
          Incoming bookings will appear here in real-time.
        </p>
      </div>
    );
  }

  const visibleAppointments = appointments.slice(0, visibleCount);
  const hasMore = visibleCount < appointments.length;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative">
      <div className="absolute top-0 right-1/4 w-64 h-64 bg-brand-purple/10 rounded-full blur-[100px] pointer-events-none" />
      
      {/* ── DESKTOP TABLE ── */}
      <div className="hidden md:block overflow-x-auto relative z-10">
        <table className="w-full text-left text-sm text-white/70">
          <thead className="bg-[#040406]/60 backdrop-blur-md text-xs uppercase text-white/40 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">
                <span className="flex items-center gap-2"><User className="w-3.5 h-3.5" /> Client</span>
              </th>
              <th className="px-6 py-4 font-semibold tracking-wider">
                <span className="flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Service</span>
              </th>
              <th className="px-6 py-4 font-semibold tracking-wider">
                <span className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Date & Time</span>
              </th>
              {!staffView && (
                <th className="px-6 py-4 font-semibold tracking-wider">
                  <span className="flex items-center gap-2"><UserPlus className="w-3.5 h-3.5" /> Staff</span>
                </th>
              )}
              <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
              <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visibleAppointments.map((appt) => {
              const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
              const isActing = loadingId?.startsWith(appt.id ?? '');
              return (
                <tr key={appt.id} className="hover:bg-white/5 transition-colors group">
                  {/* Client */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-white font-medium text-sm shadow-inner group-hover:border-brand-neon/50 group-hover:text-brand-neon transition-colors flex-shrink-0">
                        {appt.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white capitalize group-hover:text-brand-neon transition-colors">{appt.name}</div>
                        <div className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {appt.phone}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Service */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-white/80 font-medium">{appt.service}</span>
                    {appt.notes && (
                      <div className="text-xs text-white/30 mt-0.5 truncate max-w-[160px]">{appt.notes}</div>
                    )}
                  </td>
                  {/* Date & Time */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-white">{appt.date ? format(new Date(appt.date + 'T00:00:00'), 'MMM d, yyyy') : 'N/A'}</div>
                    <div className="text-xs text-brand-pink font-medium flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {appt.time}
                    </div>
                  </td>
                  {/* Staff Assignment (Admin only) */}
                  {!staffView && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={appt.staffId || ''}
                        onChange={(e) => appt.id && handleAssignStaff(appt.id, e.target.value)}
                        className="bg-zinc-800 border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 outline-none focus:border-emerald-500 transition-colors"
                      >
                        <option value="">Unassigned</option>
                        {staffList.map((s) => (
                          <option key={s.staffId} value={s.staffId}>{s.name}</option>
                        ))}
                      </select>
                      {appt.staffName && (
                        <div className="text-xs text-emerald-400 mt-0.5">{appt.staffName}</div>
                      )}
                    </td>
                  )}
                  {/* Status Badge */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide uppercase ${cfg.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass} animate-pulse`} />
                      {cfg.label}
                    </span>
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      {!staffView && appt.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(appt, 'confirmed')}
                          disabled={!!isActing}
                          title="Confirm"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 hover:bg-blue-400/20 transition-all disabled:opacity-50"
                        >
                          {loadingId === appt.id + 'confirmed' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                          Confirm
                        </button>
                      )}
                      {(appt.status === 'pending' || appt.status === 'confirmed') && (
                        <button
                          onClick={() => handleStatusChange(appt, 'completed')}
                          disabled={!!isActing}
                          title="Complete"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-green-400 bg-green-400/10 border border-green-400/20 hover:bg-green-400/20 transition-all disabled:opacity-50"
                        >
                          {loadingId === appt.id + 'completed' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                          Complete
                        </button>
                      )}
                      {!staffView && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                        <button
                          onClick={() => handleStatusChange(appt, 'cancelled')}
                          disabled={!!isActing}
                          title="Cancel"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-all disabled:opacity-50"
                        >
                          {loadingId === appt.id + 'cancelled' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Cancel
                        </button>
                      )}
                      {!staffView && (
                      <button
                        onClick={() => appt.id && handleDelete(appt.id)}
                        disabled={!!isActing}
                        title="Delete"
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 border border-transparent hover:border-red-400/20 transition-all disabled:opacity-50"
                      >
                        {loadingId === appt.id + 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE CARD VIEW ── */}
      <div className="md:hidden flex flex-col gap-3 p-4 relative z-10">
        {visibleAppointments.map((appt) => {
          const cfg = STATUS_CONFIG[appt.status] ?? STATUS_CONFIG.pending;
          const isActing = loadingId?.startsWith(appt.id ?? '');
          return (
            <div key={appt.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-3 shadow-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-white capitalize text-base">{appt.name}</div>
                  <div className="text-sm text-white/50 flex flex-col gap-1.5 mt-2">
                    <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-white/30" /> {appt.phone}</span>
                    <span className="flex items-center gap-2"><Tag className="w-4 h-4 text-white/30" /> {appt.service}</span>
                    <span className="flex items-center gap-2 text-brand-pink font-medium"><Clock className="w-4 h-4" /> {appt.date ? format(new Date(appt.date + 'T00:00:00'), 'MMM d') : ''} @ {appt.time}</span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase ${cfg.badgeClass}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass} animate-pulse`} />
                  {cfg.label}
                </span>
              </div>
              
              {!staffView && (
                <div className="pt-3 border-t border-white/10">
                  <span className="text-xs text-white/40 mb-1.5 block">Assign Stylist</span>
                  <select
                    value={appt.staffId || ''}
                    onChange={(e) => appt.id && handleAssignStaff(appt.id, e.target.value)}
                    className="w-full bg-[#07050f] border border-white/10 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors h-12"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((s) => (
                      <option key={s.staffId} value={s.staffId}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-3 border-t border-white/10 mt-1">
                {!staffView && appt.status === 'pending' && (
                  <button onClick={() => handleStatusChange(appt, 'confirmed')} disabled={!!isActing} className="flex-1 min-h-[48px] px-2 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-blue-400 bg-blue-400/10 border border-blue-400/20 active:scale-95 transition-all">Confirm</button>
                )}
                {(appt.status === 'pending' || appt.status === 'confirmed') && (
                  <button onClick={() => handleStatusChange(appt, 'completed')} disabled={!!isActing} className="flex-1 min-h-[48px] px-2 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-green-400 bg-green-400/10 border border-green-400/20 active:scale-95 transition-all">Complete</button>
                )}
                {!staffView && appt.status !== 'cancelled' && appt.status !== 'completed' && (
                  <button onClick={() => handleStatusChange(appt, 'cancelled')} disabled={!!isActing} className="flex-1 min-h-[48px] px-2 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-red-400 bg-red-400/10 border border-red-400/20 active:scale-95 transition-all">Cancel</button>
                )}
                {!staffView && (
                  <button onClick={() => appt.id && handleDelete(appt.id)} disabled={!!isActing} className="min-h-[48px] h-[48px] w-[48px] flex items-center justify-center rounded-xl text-white/30 hover:text-red-400 bg-white/5 border border-transparent hover:border-red-400/20 active:scale-95 transition-all"><Trash2 className="w-5 h-5" /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More / Show Less */}
      {appointments.length > 5 && (
        <div className="flex justify-center pt-1 pb-4">
          <button
            onClick={() => hasMore ? setVisibleCount(v => v + 5) : setVisibleCount(5)}
            className="flex items-center gap-2 px-6 py-3 min-h-[48px] rounded-xl text-sm font-bold text-white/50 hover:text-brand-purple border border-white/10 hover:border-brand-purple/30 bg-white/[0.02] hover:bg-brand-purple/5 active:scale-95 transition-all duration-200"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${hasMore ? '' : 'rotate-90'}`} />
            {hasMore ? `Show More (${appointments.length - visibleCount} remaining)` : 'Show Less'}
          </button>
        </div>
      )}
    </div>
  );
}
