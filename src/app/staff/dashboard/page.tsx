'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Clock, Phone, User, CheckCheck, Loader2, LogOut, Calendar } from 'lucide-react';
import { db } from '@/firebase';
import { ref, onValue, off, update } from 'firebase/database';
import { Appointment } from '@/firebase/db';
import { logoutFlow } from '@/firebase/auth/client-flow';
import { useRouter } from 'next/navigation';

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  confirmed: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  completed: 'text-green-400 bg-green-400/10 border-green-400/20',
  cancelled: 'text-red-400 bg-red-400/10 border-red-400/20',
};

export default function StaffDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const router = useRouter();

  const today = new Date().toISOString().split("T")[0];
  const todayDisplay = format(new Date(), 'EEEE, MMMM d');

  useEffect(() => {
    // Get the staff's email from cookie to identify who's logged in
    const rawEmail = document.cookie
      .split('; ')
      .find((r) => r.startsWith('session_email='))
      ?.split('=')[1];

    const staffEmailVal = decodeURIComponent(rawEmail || '').toLowerCase();

    // First, look up the staffId that maps to this email from the staff node
    const staffRef = ref(db, 'staff');
    let resolvedStaffId: string | null = null;

    const staffListener = onValue(staffRef, (staffSnap) => {
      if (staffSnap.exists()) {
        staffSnap.forEach((child) => {
          const member = child.val();
          if (member.email?.toLowerCase() === staffEmailVal) {
            resolvedStaffId = member.staffId || child.key;
          }
        });
      }

      // Now subscribe to appointments and filter by staffId OR staffEmail
      const apptRef = ref(db, 'appointments');
      const listener = onValue(apptRef, (snap) => {
        if (!snap.exists()) { setAppointments([]); setLoading(false); return; }
        const all: Appointment[] = [];
        snap.forEach((child) => {
          all.push({ id: child.key!, ...child.val() });
        });

        const todayAppts = all
          .filter((a) => {
            if (a.date !== today || a.status === 'cancelled') return false;
            // Match by staffEmail (new bookings) OR staffId (old bookings without staffEmail)
            const emailMatch = a.staffEmail?.toLowerCase() === staffEmailVal;
            const idMatch = resolvedStaffId && a.staffId === resolvedStaffId;
            return emailMatch || idMatch;
          })
          .sort((a, b) => a.time.localeCompare(b.time));

        setAppointments(todayAppts);
        setLoading(false);
      });

      return () => off(ref(db, 'appointments'), 'value', listener);
    });

    return () => off(staffRef, 'value', staffListener);
  }, [today]);

  const markComplete = async (id: string) => {
    setCompletingId(id);
    try {
      await update(ref(db, `appointments/${id}`), { status: 'completed' });
    } finally {
      setCompletingId(null);
    }
  };

  const handleLogout = async () => {
    await logoutFlow();
    router.push('/staff/login');
  };

  return (
    <div className="min-h-screen" style={{ background: '#07050f' }}>
      {/* Ambient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5 px-6 py-4 flex items-center justify-between"
        style={{ background: 'rgba(7,5,15,0.8)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #0ea5e9)' }}>
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-black font-syne text-base">My Schedule</h1>
            <p className="text-white/30 text-xs">{todayDisplay}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/40 hover:text-white border border-white/10 hover:border-white/20 text-sm transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Today's Bookings", value: appointments.length },
            { label: 'Completed', value: appointments.filter((a) => a.status === 'completed').length },
            { label: 'Remaining', value: appointments.filter((a) => a.status !== 'completed').length },
          ].map((s) => (
            <div key={s.label}
              className="rounded-2xl border border-white/10 p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="text-2xl font-black font-syne text-white mb-1">{s.value}</div>
              <div className="text-white/30 text-xs uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Appointments List */}
        <div>
          <h2 className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mb-4">Today&apos;s Appointments</h2>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-white/20" />
              </div>
              <p className="text-white/40 font-semibold">No appointments today</p>
              <p className="text-white/20 text-sm mt-1">Enjoy your free time!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appt, i) => (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-white/10 p-4 flex items-center gap-4"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #c026d3, #7c3aed)' }}>
                    {appt.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-semibold text-sm capitalize">{appt.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_COLORS[appt.status] || STATUS_COLORS.pending}`}>
                        {appt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.time}</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{appt.service}</span>
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{appt.phone}</span>
                    </div>
                  </div>

                  {/* Complete button */}
                  {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                    <button
                      onClick={() => appt.id && markComplete(appt.id)}
                      disabled={completingId === appt.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-green-400 border border-green-400/20 bg-green-400/10 hover:bg-green-400/20 transition-all disabled:opacity-50 flex-shrink-0"
                    >
                      {completingId === appt.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3 h-3" />
                      )}
                      Done
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
