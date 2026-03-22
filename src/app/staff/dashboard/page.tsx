'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Clock, Phone, User, CheckCheck, Loader2, LogOut, Calendar, CalendarMinus } from 'lucide-react';
import { db } from '@/firebase';
import { ref, onValue, off, update, set, remove } from 'firebase/database';
import { Appointment } from '@/firebase/db';
import { logoutFlow } from '@/firebase/auth/client-flow';
import { useRouter } from 'next/navigation';
import { NotificationsBell } from '@/components/admin/notifications-bell';
import { useToast } from '@/hooks/use-toast';

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
  
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);
  const [leaveDate, setLeaveDate] = useState<string>('');
  const [isOnLeave, setIsOnLeave] = useState<boolean>(false);
  const [leaveLoading, setLeaveLoading] = useState<boolean>(false);
  
  const [allLeaves, setAllLeaves] = useState<any[]>([]);
  const [leaveType, setLeaveType] = useState<'full' | 'partial'>('full');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');

  const router = useRouter();
  const { toast } = useToast();

  const today = new Date().toISOString().split("T")[0];
  const todayDisplay = format(new Date(), 'EEEE, MMMM d');

  useEffect(() => {
    // Get the staff's email from cookie to identify who's logged in
    const rawEmail = document.cookie
      .split('; ')
      .find((r) => r.startsWith('session_email='))
      ?.split('=')[1];

    const staffEmailVal = decodeURIComponent(rawEmail || '').toLowerCase();

    const staffRef = ref(db, 'staff');
    let resolvedStaffId: string | null = null;

    const staffListener = onValue(staffRef, (staffSnap) => {
      if (staffSnap.exists()) {
        staffSnap.forEach((child) => {
          const member = child.val();
          if (member.email?.toLowerCase() === staffEmailVal) {
            resolvedStaffId = member.staffId || child.key;
            setCurrentStaffId(resolvedStaffId);
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

  useEffect(() => {
    if (!currentStaffId) {
      setAllLeaves([]);
      setIsOnLeave(false);
      return;
    }
    const leavesRef = ref(db, `staffLeaves/${currentStaffId}`);
    const listener = onValue(leavesRef, (snap) => {
      const data = snap.val() || {};
      const leavesList = Object.entries(data).map(([date, val]: any) => ({
        date,
        ...val
      })).sort((a, b) => a.date.localeCompare(b.date));
      
      setAllLeaves(leavesList);

      if (leaveDate && data[leaveDate]) {
         const d = data[leaveDate];
         setIsOnLeave(d === true || d.unavailable === true || d.type === 'full' || d.type === 'partial');
      } else {
         setIsOnLeave(false);
      }
    });
    return () => off(leavesRef, 'value', listener);
  }, [currentStaffId, leaveDate]);

  const markComplete = async (id: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;

    if (appt.date && appt.time) {
      const now = new Date();
      const [year, month, day] = appt.date.split('-').map(Number);
      const [hour, minute] = appt.time.split(':').map(Number);
      const start = new Date(year, month - 1, day, hour, minute);
      const durationMins = appt.serviceDuration || 30;
      const endTime = new Date(start.getTime() + durationMins * 60_000);

      if (now < endTime) {
        toast({ variant: "destructive", title: "Action Prevented", description: "Service not completed yet. Please wait until end time." });
        return;
      }
    }

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
        <div className="flex items-center gap-3">
          <NotificationsBell />
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/40 hover:text-white border border-white/10 hover:border-white/20 text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: "Bookings", value: appointments.length, color: '#3b82f6' },
            { label: 'Completed', value: appointments.filter((a) => a.status === 'completed').length, color: '#10b981' },
            { label: 'Pending', value: appointments.filter((a) => a.status !== 'completed').length, color: '#f59e0b' },
          ].map((s) => (
            <div key={s.label}
              className="rounded-2xl border border-white/10 p-4 text-center relative overflow-hidden group transition-all duration-300 hover:border-white/20"
              style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)' }}>
              <div className="absolute -right-4 -top-4 w-12 h-12 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ background: s.color }} />
              <div className="text-2xl font-black font-syne text-white mb-0.5 relative z-10">{s.value}</div>
              <div className="text-white/30 text-[10px] uppercase font-bold tracking-widest relative z-10">{s.label}</div>
            </div>
          ))}
        </div>

         <div className="mb-10 p-5 rounded-2xl border border-red-500/20 bg-red-500/5 relative overflow-hidden group transition-all hover:border-red-500/30">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5 opacity-50"></div>
            <div className="relative flex flex-col gap-4 items-start w-full">
               <div className="flex flex-col md:flex-row gap-4 items-end w-full">
                 <div className="flex-1 w-full flex flex-col gap-2">
                   <label className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-widest">
                     <CalendarMinus className="w-4 h-4 text-red-400" />
                     Manage Leave Days {!currentStaffId && "(Re-login to sync)"}
                   </label>
                   <div className="flex flex-col md:flex-row gap-3">
                     <input 
                       type="date" 
                       value={leaveDate} 
                       onChange={e => setLeaveDate(e.target.value)} 
                       min={today} 
                       disabled={!currentStaffId}
                       className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-red-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                     />
                     <select 
                       value={leaveType}
                       onChange={e => setLeaveType(e.target.value as 'full' | 'partial')}
                       disabled={!currentStaffId || isOnLeave}
                       className="h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-red-400 transition-all cursor-pointer disabled:opacity-50"
                     >
                        <option value="full" className="bg-[#07050f]">Full Day</option>
                        <option value="partial" className="bg-[#07050f]">Partial Day</option>
                     </select>
                   </div>
                 </div>

                 <button 
                   disabled={!leaveDate || leaveLoading || !currentStaffId}
                   onClick={async () => {
                     setLeaveLoading(true);
                     try {
                       const targetRef = ref(db, `staffLeaves/${currentStaffId}/${leaveDate}`);
                       if (isOnLeave) {
                         await remove(targetRef);
                         toast({ title: "Available 🟢", description: `You have removed your leave for ${leaveDate}.` });
                       } else {
                         const payload = leaveType === 'full' 
                           ? { type: 'full', status: 'pending', createdAt: Date.now() }
                           : { type: 'partial', startTime, endTime, status: 'pending', createdAt: Date.now() };
                         await set(targetRef, payload);
                         toast({ title: "Leave Requested 🔴", description: `Your leave for ${leaveDate} is pending admin approval.`, variant: "default" });
                       }
                     } finally {
                       setLeaveLoading(false);
                     }
                   }}
                   className={`h-12 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-all min-w-[180px] shadow-lg ${
                     !leaveDate || !currentStaffId ? "bg-white/5 text-white/20 border-white/5 cursor-not-allowed" :
                     isOnLeave 
                       ? "bg-white/10 text-white hover:bg-white/20 border border-white/20 hover:border-white/30" 
                       : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                   }`}
                 >
                   {leaveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                   {!currentStaffId ? "Session Expired" : !leaveDate ? "Select a date" : isOnLeave ? "Remove Leave" : "Request Leave"}
                 </button>
               </div>

               {leaveType === 'partial' && !isOnLeave && (
                 <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex gap-3 w-full max-w-sm mt-1">
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-red-400" />
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="flex-1 h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:border-red-400" />
                 </motion.div>
               )}

               {allLeaves.length > 0 && (
                 <div className="w-full mt-4 flex flex-col gap-2">
                   <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-1">Your Scheduled Leaves</p>
                   {allLeaves.map(l => {
                     const isLegacy = l.unavailable === true && !l.type;
                     const displayType = isLegacy ? 'Full Day' : l.type === 'partial' ? `${l.startTime} to ${l.endTime}` : 'Full Day';
                     return (
                       <div key={l.date} className="px-3 py-2.5 rounded-lg border border-white/5 bg-black/20 flex items-center justify-between text-xs backdrop-blur-sm">
                          <span className="text-white/80 font-medium">
                            {format(new Date(l.date), 'MMM d, yyyy')} <span className="text-white/40 ml-2">({displayType})</span>
                          </span>
                          <span className={`px-2.5 py-1 rounded-md font-bold uppercase text-[9px] tracking-wider ${
                             (l.status === 'approved' || isLegacy) ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 
                             l.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                             'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {(l.status || (isLegacy ? 'approved' : 'pending'))}
                          </span>
                       </div>
                     )
                   })}
                 </div>
               )}
            </div>
         </div>

        {/* Appointments List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-white/40 text-xs font-bold uppercase tracking-[0.2em]">Today&apos;s Appointments</h2>
            <span className="text-[10px] text-white/20 font-medium">Real-time sync enabled</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-white/[0.03] animate-pulse border border-white/5" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 ring-1 ring-white/10">
                <Calendar className="w-8 h-8 text-white/10" />
              </div>
              <p className="text-white font-bold text-lg mb-1">No bookings today</p>
              <p className="text-white/20 text-sm">You have a clear schedule! ✨</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((appt, i) => (
                <motion.div
                  key={appt.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-white/10 p-5 flex items-center gap-5 group transition-all duration-300 hover:border-white/20 hover:bg-white/[0.05] relative overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg shadow-black/20"
                    style={{ background: 'linear-gradient(135deg, #c026d3, #7c3aed)' }}>
                    {appt.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-white font-bold text-base capitalize tracking-tight">{appt.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border tracking-wider ${STATUS_COLORS[appt.status] || STATUS_COLORS.pending}`}>
                        {appt.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40">
                      <span className="flex items-center gap-1.5 font-medium text-blue-400/80"><Clock className="w-3.5 h-3.5" />{appt.time}</span>
                      <span className="flex items-center gap-1.5 font-medium text-fuchsia-400/80"><User className="w-3.5 h-3.5" />{appt.service}</span>
                      <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 opacity-50" />{appt.phone}</span>
                    </div>
                  </div>

                  {/* Complete button */}
                  {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                    <button
                      onClick={() => appt.id && markComplete(appt.id)}
                      disabled={completingId === appt.id}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black text-green-400 border border-green-400/20 bg-green-400/5 hover:bg-green-400/10 hover:border-green-400/40 transition-all disabled:opacity-50 flex-shrink-0"
                      style={{ boxShadow: '0 0 20px rgba(16,185,129,0)' }}
                      onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 15px rgba(16,185,129,0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0 20px rgba(16,185,129,0)'}
                    >
                      {completingId === appt.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCheck className="w-4 h-4" />
                      )}
                      DONE
                    </button>
                  )}

                  {appt.status === 'completed' && (
                    <div className="p-2 rounded-full bg-green-500/10 text-green-400">
                      <CheckCheck className="w-5 h-5" />
                    </div>
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
