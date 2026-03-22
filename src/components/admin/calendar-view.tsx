'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Calendar, momentLocalizer, Event, Views, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { Appointment, checkBookingOverlap } from '@/firebase/db';
import { db } from '@/firebase';
import { ref, update, onValue, off } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, Scissors, User, Phone,
  CheckCircle2, AlertCircle, XCircle, Circle,
  CalendarDays,
} from 'lucide-react';

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar as any);

// ─── Types ─────────────────────────────────────────────────
interface CalendarViewProps { appointments: Appointment[]; }

interface CalendarEvent extends Event {
  id: string;
  status: string;
  appointmentData: Appointment;
}

interface PanelState {
  open: boolean;
  date: Date | null;
  events: CalendarEvent[];
}

// ─── Constant Maps ──────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  pending:   '#facc15',
  confirmed: '#4ade80',
  completed: '#60a5fa',
  cancelled: '#f87171',
};
const STATUS_BG: Record<string, string> = {
  pending:   'rgba(250,204,21,0.12)',
  confirmed: 'rgba(74,222,128,0.12)',
  completed: 'rgba(96,165,250,0.12)',
  cancelled: 'rgba(248,113,113,0.12)',
};
const STATUS_ICON: Record<string, React.ElementType> = {
  pending:   AlertCircle,
  confirmed: CheckCircle2,
  completed: Circle,
  cancelled: XCircle,
};

// ─── Custom Event Card ──────────────────────────────────────
function EventCard({ event }: { event: CalendarEvent }) {
  const { toast } = useToast();
  const appt = event.appointmentData;
  const color = STATUS_COLOR[event.status] ?? '#a78bfa';

  const handleDragStart = (e: React.DragEvent) => {
    if (event.status === 'completed') {
      e.preventDefault();
      toast({ title: 'Not Allowed', description: 'Completed bookings cannot be rescheduled.', variant: 'destructive' });
      return;
    }
    if (event.status === 'cancelled') {
      e.preventDefault();
      toast({ title: 'Not Allowed', description: 'Cancelled bookings cannot be rescheduled.', variant: 'destructive' });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apptDate = new Date(appt.date);
    apptDate.setHours(0, 0, 0, 0);
    if (apptDate < today) {
      e.preventDefault();
      toast({ title: 'Not Allowed', description: 'Past bookings cannot be rescheduled.', variant: 'destructive' });
      return;
    }

    e.stopPropagation();
    e.dataTransfer.setData("bookingId", event.id as string);
    (window as any).__draggedBookingId = event.id;
  };

  return (
    <div
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={() => {
        (window as any).__draggedBookingId = null;
      }}
      className="group w-full h-full rounded-lg px-2 py-1 text-[11px] leading-tight overflow-hidden transition-all duration-150 hover:scale-[1.02] cursor-grab active:cursor-grabbing"
      style={{
        background: `${color}14`,
        borderLeft: `2.5px solid ${color}`,
        color: color,
      }}
      title={`${appt.name} · ${appt.service} · ${appt.time}`}
    >
      <div className="font-bold truncate text-white" style={{ fontSize: '11px' }}>{appt.name}</div>
      <div className="flex items-center gap-1 mt-0.5 opacity-70 truncate">
        <Clock className="w-2.5 h-2.5 flex-shrink-0" />
        <span>{appt.time}</span>
        <span className="hidden sm:inline">· {appt.service}</span>
      </div>
    </div>
  );
}

// ─── Clustering Algorithm ───────────────────────────────────
/**
 * Groups events by day and then clusters them if more than 2 overlap transitively.
 * A transitive overlap group is a set of events where each event's interval 
 * overlaps with the union of the previous intervals in that group.
 */
function clusterTimelineEvents(events: CalendarEvent[]): any[] {
  // 1. Group by Day
  const dayGroups: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const d = (ev.start as Date).toDateString();
    if (!dayGroups[d]) dayGroups[d] = [];
    dayGroups[d].push(ev);
  }

  const result: any[] = [];

  for (const dayStr of Object.keys(dayGroups)) {
    const dayEvents = dayGroups[dayStr].sort((a, b) => 
      (a.start as Date).getTime() - (b.start as Date).getTime() ||
      (b.end as Date).getTime() - (a.end as Date).getTime()
    );

    let i = 0;
    while (i < dayEvents.length) {
      let batch = [dayEvents[i]];
      let batchEnd = (dayEvents[i].end as Date).getTime();
      let j = i + 1;

      // Sweep-line: find all events that transitively overlap
      while (j < dayEvents.length) {
        const nextStart = (dayEvents[j].start as Date).getTime();
        if (nextStart < batchEnd) {
          batch.push(dayEvents[j]);
          batchEnd = Math.max(batchEnd, (dayEvents[j].end as Date).getTime());
          j++;
        } else {
          break;
        }
      }

      // If batch > 2, collapse into cluster
      if (batch.length > 2) {
        const start = new Date(Math.min(...batch.map(e => (e.start as Date).getTime())));
        const end = new Date(batchEnd);
        result.push({
          id: `cluster-${start.getTime()}-${dayStr}`,
          title: `+${batch.length} bookings`,
          start,
          end,
          status: 'cluster',
          clusterEvents: batch,
          appointmentData: {} as any
        });
      } else {
        // Keep 1 or 2 as individual events
        result.push(...batch);
      }
      i = j; // Move to next non-overlapping event
    }
  }

  return result;
}

function WeekEventCard({ event }: { event: any }) {
  if (event.status === 'cluster') {
    return (
      <div
        className="w-full h-full group"
        style={{ padding: '3px 4px', boxSizing: 'border-box' }}
      >
        <div
          className="w-full h-full rounded-xl px-3 py-3 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer hover:scale-[1.02] relative"
          style={{
            background: 'linear-gradient(to bottom right, rgba(139,92,246,0.32), rgba(124,58,237,0.15))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1.5px dashed rgba(139,92,246,0.5)',
            color: '#e9d5ff',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 0 20px rgba(139,92,246,0.12)',
            minHeight: '80px',
            boxSizing: 'border-box',
          }}
          onMouseEnter={(e) => { 
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(139,92,246,0.4)'; 
            e.currentTarget.style.border = '1.5px dashed rgba(139,92,246,0.9)';
            e.currentTarget.style.background = 'linear-gradient(to bottom right, rgba(139,92,246,0.38), rgba(124,58,237,0.22))';
          }}
          onMouseLeave={(e) => { 
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2), inset 0 0 20px rgba(139,92,246,0.12)'; 
            e.currentTarget.style.border = '1.5px dashed rgba(139,92,246,0.5)';
            e.currentTarget.style.background = 'linear-gradient(to bottom right, rgba(139,92,246,0.32), rgba(124,58,237,0.15))';
          }}
          title={event.title}
        >
          <span className="font-black text-[14px] whitespace-nowrap text-ellipsis overflow-hidden drop-shadow-lg flex items-center justify-center gap-1.5 w-full text-center tracking-tight">
            {event.title} <span className="opacity-70 group-hover:translate-x-1.5 transition-transform">→</span>
          </span>
        </div>
      </div>
    );
  }

  const { toast } = useToast();
  const appt = event.appointmentData;
  const color = STATUS_COLOR[event.status] ?? '#a78bfa';

  const handleDragStart = (e: React.DragEvent) => {
    if (event.status === 'completed') {
      e.preventDefault();
      toast({ title: 'Not Allowed', description: 'Completed bookings cannot be rescheduled.', variant: 'destructive' });
      return;
    }
    if (event.status === 'cancelled') {
      e.preventDefault();
      toast({ title: 'Not Allowed', description: 'Cancelled bookings cannot be rescheduled.', variant: 'destructive' });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apptDate = new Date(appt.date);
    apptDate.setHours(0, 0, 0, 0);
    if (apptDate < today) {
      e.preventDefault();
      toast({ title: 'Not Allowed', description: 'Past bookings cannot be rescheduled.', variant: 'destructive' });
      return;
    }

    e.stopPropagation();
    e.dataTransfer.setData("bookingId", event.id as string);
    (window as any).__draggedBookingId = event.id;
  };

  return (
    <div
      className="w-full h-full group"
      style={{ padding: '3px 6px', boxSizing: 'border-box' }}
      draggable={true}
      onDragStart={handleDragStart}
      onDragEnd={() => {
        (window as any).__draggedBookingId = null;
      }}
    >
      <div
        className="w-full h-full rounded-xl px-3 py-3 transition-all duration-300 cursor-grab active:cursor-grabbing flex flex-col"
        style={{
          background: `${color}1E`,
          borderLeft: `5px solid ${color}`,
          borderTop: `1px solid ${color}45`,
          borderRight: `1px solid ${color}45`,
          borderBottom: `1px solid ${color}45`,
          boxShadow: '0 10px 24px rgba(0,0,0,0.2)',
          minHeight: '80px',
          backdropFilter: 'blur(12px)',
          boxSizing: 'border-box',
          zIndex: 10,
        }}
        onMouseEnter={(e) => { 
          e.currentTarget.style.boxShadow = `0 14px 28px ${color}50`; 
          e.currentTarget.style.background = `${color}28`; 
        }}
        onMouseLeave={(e) => { 
          e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.2)'; 
          e.currentTarget.style.background = `${color}1E`; 
        }}
        title={`${appt.name} · ${appt.service} · ${appt.time}`}
      >
        <div className="font-black truncate text-[13px] text-white leading-tight drop-shadow-md mb-2 tracking-tight">
          {appt.name}
        </div>
        <div className="flex flex-col gap-1.5 text-[11px] font-medium">
          <span className="flex items-center gap-2 text-white/90" style={{ minWidth: 0 }}>
            <Clock className="w-3.5 h-3.5 flex-shrink-0 text-white/50" />
            <span className="truncate">{appt.time}</span>
          </span>
          <span className="flex items-center gap-2 text-white/70" style={{ minWidth: 0 }}>
            <Scissors className="w-3.5 h-3.5 flex-shrink-0 text-white/40" />
            <span className="truncate">{appt.service}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
// ─── Custom Agenda View ─────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled'
};

function CustomAgendaView({ events, onSelectEvent }: { events: CalendarEvent[]; onSelectEvent: (e: CalendarEvent) => void }) {
  const now = new Date();
  // Show all appointments from start of today onwards
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const upcoming = events
    .filter(e => (e.start as Date) >= startOfToday)
    .sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime());

  const grouped: Record<string, CalendarEvent[]> = {};
  for (const ev of upcoming) {
    const key = (ev.start as Date).toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(ev);
  }

  if (upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <CalendarDays className="w-12 h-12 text-white/15" />
        <p className="text-white/30 text-sm font-medium">No upcoming bookings</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-2">
      {Object.entries(grouped).map(([dateStr, dayEvents]) => {
        const date = new Date(dateStr);
        const isToday = date.toDateString() === now.toDateString();
        const dayLabel = isToday
          ? 'Today'
          : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        return (
          <div key={dateStr}>
            {/* Date header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase"
                style={{
                  background: isToday ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)',
                  color: isToday ? '#c084fc' : 'rgba(255,255,255,0.45)',
                  border: isToday ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {dayLabel}
              </div>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-xs text-white/25 font-medium">{dayEvents.length} booking{dayEvents.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Booking cards */}
            <div className="flex flex-col gap-2">
              {dayEvents.map(ev => {
                const appt = ev.appointmentData;
                const color = STATUS_COLOR[ev.status] ?? '#a78bfa';
                const Icon = STATUS_ICON[ev.status] ?? Circle;
                const startTime = (ev.start as Date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const endTime = (ev.end as Date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className="group flex items-center gap-4 rounded-xl px-4 py-3.5 cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: `${color}12`,
                      border: `1px solid ${color}28`,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = `${color}20`;
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${color}28`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = `${color}12`;
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.15)';
                    }}
                  >
                    {/* Time column */}
                    <div className="flex flex-col items-center justify-center w-16 flex-shrink-0">
                      <span className="text-[13px] font-black text-white/90">{startTime}</span>
                      <span className="text-[10px] text-white/30 font-medium">{endTime}</span>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-10 flex-shrink-0 rounded-full" style={{ background: `${color}50` }} />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-white text-[14px] leading-tight truncate mb-1">{appt.name}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                        <Scissors className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{appt.service}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: `${color}20`, color, border: `1px solid ${color}40` }}
                    >
                      <Icon className="w-3 h-3" />
                      {STATUS_LABEL[ev.status] ?? ev.status}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export function CalendarView({ appointments }: CalendarViewProps) {
  const { toast } = useToast();
  const [panel, setPanel] = useState<PanelState>({ open: false, date: null, events: [] });
  const [view, setView] = useState<View>(Views.MONTH);
  const [isMobile, setIsMobile] = useState(false);
  const [resources, setResources] = useState<any[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const staffRef = ref(db, 'staff');
    const listener = onValue(staffRef, (snap) => {
      const data = snap.val();
      if (data) {
        const r = Object.entries(data).map(([id, s]: any) => ({
          resourceId: id,
          resourceTitle: s.name,
          email: s.email,
        }));
        r.push({ resourceId: 'unassigned', resourceTitle: 'Unassigned', email: '' });
        setResources(r);
      } else {
        setResources([{ resourceId: 'unassigned', resourceTitle: 'Unassigned', email: '' }]);
      }
    });
    return () => off(staffRef, 'value', listener);
  }, []);

  const allEvents = useMemo<CalendarEvent[]>(() => {
    return appointments
      .filter(a => a.date && a.time && a.name && a.service)
      .sort((a, b) => {
        // Enforce exact sorting consistency by startTime as requested
        const timeA = new Date(`${a.date}T${a.time}`).getTime();
        const timeB = new Date(`${b.date}T${b.time}`).getTime();
        return timeA - timeB;
      })
      .map(a => {
        const [year, month, day] = a.date.split('-').map(Number);
        const [hour, minute] = a.time.split(':').map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(start.getTime() + Math.max(a.serviceDuration || 30, 30) * 60_000);
        return {
          id: a.id!,
          title: `${a.name} – ${a.service}`,
          start,
          end,
          status: a.status,
          resourceId: a.staffId || 'unassigned',
          appointmentData: a,
        };
      });
  }, [appointments]);

  const events = useMemo<CalendarEvent[]>(() => {
    return allEvents.filter(e => e.status !== 'cancelled');
  }, [allEvents]);

  const displayEvents = useMemo(() => {
    if (view === Views.MONTH || view === Views.AGENDA) return events;
    return clusterTimelineEvents(events);
  }, [events, view]);

  const isDraggableAuth = useCallback((event: CalendarEvent) => {
    if (event.status === 'completed') return false;
    if (event.status === 'cancelled') return false;
    
    // Past bookings cannot be rescheduled rule
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const isPast = (event.start as Date) < startOfToday;
    if (isPast) return false;
    
    return true;
  }, []);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const isDraggable = isDraggableAuth(event);
    return {
      style: {
        background: 'transparent',
        opacity: (!isDraggable && event.status !== 'cluster') ? 0.6 : 1,
        cursor: (!isDraggable && event.status !== 'cluster') ? 'not-allowed' : undefined,
      },
    };
  }, [isDraggableAuth]);

  const onEventDrop = useCallback(async ({ event, start, end, resourceId }: any) => {
    if (event.status === 'completed') {
      toast({ title: "Not Allowed", description: "Completed bookings cannot be rescheduled.", variant: "destructive" });
      return;
    }
    if (event.status === 'cancelled') {
      toast({ title: "Not Allowed", description: "Cancelled bookings cannot be rescheduled.", variant: "destructive" });
      return;
    }

    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    const dropDate = `${year}-${month}-${day}`;

    const dropStaffId = resourceId === 'unassigned' ? '' : resourceId;

    const durationMins = event.appointmentData.serviceDuration || 30;
    const newStartMins = start.getHours() * 60 + start.getMinutes();
    const newEndMins = newStartMins + durationMins;

    if (dropStaffId) {
      const { ref: dbRef, get: dbGet } = await import('firebase/database');
      const leaveRef = dbRef(db, `staffLeaves/${dropStaffId}/${dropDate}`);
      const leaveSnap = await dbGet(leaveRef);
      
      if (leaveSnap.exists()) {
        const leaveData = leaveSnap.val();
        const status = leaveData?.status || 'approved'; // Legacy leaves missing status assume approved
        
        if (status === 'approved') {
          if (leaveData === true || leaveData?.unavailable === true || leaveData?.type === 'full') {
            toast({ title: "Not Allowed", description: "Staff member is on full-day leave.", variant: "destructive" });
            return;
          } else if (leaveData?.type === 'partial' && leaveData.startTime && leaveData.endTime) {
             const [sH, sM] = leaveData.startTime.split(":").map(Number);
             const [eH, eM] = leaveData.endTime.split(":").map(Number);
             const leaveStartMins = sH * 60 + sM;
             const leaveEndMins = eH * 60 + eM;
             
             if (newStartMins < leaveEndMins && newEndMins > leaveStartMins) {
               toast({ title: "Not Allowed", description: "Timeslot overlaps with staff partial leave.", variant: "destructive" });
               return;
             }
          }
        }
      }
      
      const lunchStart = 13 * 60;
      const lunchEnd = 14 * 60;
      const breakStart = 17 * 60;
      const breakEnd = 17 * 60 + 30;
      
      if ((newStartMins < lunchEnd && newEndMins > lunchStart) || (newStartMins < breakEnd && newEndMins > breakStart)) {
         toast({ title: "Not Allowed", description: "Timeslot overlaps with mandatory breaks.", variant: "destructive" });
         return;
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const apptDate = new Date(event.appointmentData.date);
    apptDate.setHours(0, 0, 0, 0);
    if (apptDate < today) {
      toast({ title: "Not Allowed", description: "Past bookings cannot be rescheduled.", variant: "destructive" });
      return;
    }

    let updatedStaffId = event.appointmentData.staffId || '';
    let updatedStaffName = event.appointmentData.staffName || '';
    let updatedStaffEmail = event.appointmentData.staffEmail || '';

    // Handle drag across staff columns
    if (resourceId && resourceId !== (event.appointmentData.staffId || 'unassigned')) {
      if (resourceId === 'unassigned') {
        updatedStaffId = '';
        updatedStaffName = '';
        updatedStaffEmail = '';
      } else {
        const staffRef = resources.find((r) => r.resourceId === resourceId);
        if (staffRef) {
          updatedStaffId = staffRef.resourceId;
          updatedStaffName = staffRef.resourceTitle;
          updatedStaffEmail = staffRef.email;
        }
      }
    }

    const targetStaffId = resourceId && resourceId !== 'unassigned' ? resourceId : updatedStaffId;

    const dateStr = [
      start.getFullYear(),
      String(start.getMonth() + 1).padStart(2, '0'),
      String(start.getDate()).padStart(2, '0'),
    ].join('-');
    const timeStr = [
      String(start.getHours()).padStart(2, '0'),
      String(start.getMinutes()).padStart(2, '0'),
    ].join(':');

    // 🔥 In-memory validation matching the exact schema logic requested
    const isConflict = allEvents.some(b => {
      // Ignore current booking
      if (b.id === event.id) return false;
      if (b.status === 'cancelled') return false;

      const appt = b.appointmentData;
      
      // Strict Staff id match
      if ((appt.staffId || '') !== (targetStaffId || '')) return false;

      // Strict Date string match
      if (appt.date !== dateStr) return false;

      // Time overlap match
      const [bHour, bMin] = appt.time.split(':').map(Number);
      const bStartMins = bHour * 60 + bMin;
      const bEndMins = bStartMins + (appt.serviceDuration || 30);

      return newStartMins < bEndMins && newEndMins > bStartMins;
    });

    if (isConflict) {
      toast({ title: "Schedule Conflict", description: `This timeslot overlaps with another booking for this staff member.`, variant: "destructive" });
      return;
    }

    try {
      await update(ref(db, `appointments/${event.id}`), {
        date: dateStr,
        time: timeStr,
        staffId: updatedStaffId,
        staffName: updatedStaffName,
        staffEmail: updatedStaffEmail,
      });
      toast({ title: "Booking Rescheduled", description: `Moved to ${dateStr} at ${timeStr}` });
    } catch (err) {
      toast({ title: "Failed", description: "Could not persist reschedule.", variant: "destructive" });
      console.error(err);
    }
  }, [allEvents, toast]);

  const handleDropFromOutside = useCallback((args: any) => {
    console.log("Dropped on slot");
    const draggedId = (window as any).__draggedBookingId;
    if (!draggedId) return;
    
    const event = allEvents.find(e => e.id === draggedId);
    if (event) {
      onEventDrop({ ...args, event });
    }
    (window as any).__draggedBookingId = null;
  }, [allEvents, onEventDrop]);

  const openPanel = useCallback((date: Date, evts: CalendarEvent[]) => {
    setPanel({ open: true, date, events: evts });
  }, []);

  const closePanel = useCallback(() => {
    setPanel(prev => ({ ...prev, open: false }));
  }, []);

  const handleSelectEvent = useCallback((event: any) => {
    if (event.status === 'cluster') {
      openPanel(event.start as Date, event.clusterEvents);
      return;
    }
    const date = event.start as Date;
    const dayEvents = events.filter(e => (e.start as Date).toDateString() === date.toDateString());
    openPanel(date, dayEvents);
  }, [events, openPanel]);

  const handleShowMore = useCallback((evts: CalendarEvent[], date: Date) => {
    openPanel(date, evts);
  }, [openPanel]);

  const handleDrillDown = useCallback((date: Date) => {
    const dayEvents = events.filter(e => (e.start as Date).toDateString() === date.toDateString());
    openPanel(date, dayEvents);
  }, [events, openPanel]);

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    const dayEvents = events.filter(e => (e.start as Date).toDateString() === start.toDateString());
    openPanel(start, dayEvents);
  }, [events, openPanel]);

  // Close panel on outside click
  useEffect(() => {
    if (!panel.open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => document.removeEventListener('mousedown', handler);
  }, [panel.open, closePanel]);

  // ── PANEL ANIMATION ─────────────────────────────────────
  const desktopPanelVariants = {
    hidden: { x: '110%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 30, stiffness: 320 } },
    exit: { x: '110%', opacity: 0, transition: { duration: 0.22 } },
  };
  const mobilePanelVariants = {
    hidden: { y: '100%', opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, damping: 30, stiffness: 300 } },
    exit: { y: '110%', opacity: 0, transition: { duration: 0.22 } },
  };

  return (
    <>
      {/* ── Calendar Card ── */}
      <div 
        className="relative rounded-2xl border border-white/10 p-4 min-h-[620px]" 
        style={{ background: 'rgba(255,255,255,0.02)', pointerEvents: 'auto' }}
        onDragOver={(e) => e.preventDefault()}
      >
        <style>{`
          /* Base reset */
          .rbc-calendar { background: transparent; color: rgba(255,255,255,0.85); font-family: inherit; }

          /* HEADER ROW */
          .rbc-header {
            background: rgba(255,255,255,0.03);
            border-color: rgba(255,255,255,0.07) !important;
            color: rgba(255,255,255,0.35);
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 700;
            padding: 12px 0;
          }

          /* MONTH GRID */
          .rbc-month-view { border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 12px; }
          .rbc-month-row { 
            border-color: rgba(255,255,255,0.06) !important; 
            max-height: 180px; 
            overflow-y: auto !important; 
          }
           /* Ensure stacking renders fully rather than hiding */
          .rbc-row-content { overflow: visible !important; }
          .rbc-day-bg + .rbc-day-bg { border-color: rgba(255,255,255,0.06) !important; }
          .rbc-off-range-bg { background: rgba(0,0,0,0.18); }
          .rbc-today { background: rgba(124,58,237,0.07) !important; }

          /* DATE NUMBERS */
          .rbc-date-cell { padding: 6px 8px 2px; font-size: 12px; color: rgba(255,255,255,0.45); }
          .rbc-date-cell.rbc-now { font-weight: 800; color: #a78bfa; }
          .rbc-date-cell a { color: inherit !important; }

          /* DAY CELL HOVER */
          .rbc-day-bg { transition: background 0.15s; cursor: pointer; }
          .rbc-day-bg:hover { background: rgba(124,58,237,0.06) !important; }

          /* EVENT SLOTS */
          .rbc-row-segment { padding: 1px 3px; max-height: none !important; }
          .rbc-event { background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; border-radius: 8px !important; box-sizing: border-box !important; }
          .rbc-event:focus { outline: none; }
          .rbc-event-content { height: 100%; }
          .rbc-time-view .rbc-event-label { display: none !important; }

          /* SHOW MORE LINK */
          .rbc-show-more { display: none !important; }
            color: #a78bfa;
            font-size: 10px;
            font-weight: 700;
            padding: 1px 6px;
            border-radius: 5px;
            background: rgba(124,58,237,0.15);
            border: 1px solid rgba(124,58,237,0.25);
            transition: background 0.15s;
            cursor: pointer;
            margin-top: 1px;
          }
          .rbc-show-more:hover { background: rgba(124,58,237,0.28); }

          /* TOOLBAR */
          .rbc-toolbar { margin-bottom: 18px; flex-wrap: wrap; gap: 8px; }
          .rbc-toolbar button {
            color: rgba(255,255,255,0.55);
            border-color: rgba(255,255,255,0.1) !important;
            background: rgba(255,255,255,0.04) !important;
            border-radius: 8px !important;
            padding: 6px 14px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            transition: all 0.15s !important;
          }
          .rbc-toolbar button:hover { background: rgba(124,58,237,0.18) !important; color: #a78bfa !important; border-color: rgba(124,58,237,0.35) !important; }
          .rbc-toolbar button.rbc-active { background: rgba(124,58,237,0.28) !important; color: #a78bfa !important; border-color: rgba(124,58,237,0.5) !important; }
          .rbc-toolbar-label { color: rgba(255,255,255,0.9); font-weight: 700; font-size: 15px; letter-spacing: -0.01em; }

          /* WEEK / DAY TIMELINE  */
          .rbc-time-view { border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 12px; overflow: hidden; background: transparent !important; }
          .rbc-time-header { border-color: rgba(255,255,255,0.07) !important; background: transparent !important; }
          .rbc-time-header-content { border-color: rgba(255,255,255,0.07) !important; }
          .rbc-time-header-cell { padding: 12px 0; color: #a78bfa; font-weight: 800; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; background: rgba(0,0,0,0.15); border-left: 1px solid rgba(255,255,255,0.07); }
          .rbc-time-header-gutter { background: transparent !important; border-color: rgba(255,255,255,0.07) !important; }
          .rbc-time-content { border-color: rgba(255,255,255,0.07) !important; }
          .rbc-time-column { border-color: rgba(255,255,255,0.07) !important; }
          .rbc-timeslot-group { border-color: rgba(255,255,255,0.04) !important; min-height: 80px !important; }
          .rbc-time-slot { border-color: rgba(255,255,255,0.03) !important; }
          .rbc-time-gutter { background: transparent !important; border-color: rgba(255,255,255,0.07) !important; }
          .rbc-day-bg.rbc-today { background: linear-gradient(to bottom, rgba(167, 139, 250, 0.08), rgba(167, 139, 250, 0.01)) !important; }
          .rbc-time-gutter .rbc-label { color: rgba(255,255,255,0.45); font-size: 11px; font-weight: 700; letter-spacing: 0.05em; padding-right: 14px; }
          .rbc-current-time-indicator { background: #a78bfa; height: 2px; box-shadow: 0 0 12px #a78bfa; }
          .rbc-day-slot .rbc-time-slot { border-color: rgba(255,255,255,0.03) !important; }
          .rbc-day-slot .rbc-event { 
            z-index: 10;
          }
          .rbc-allday-cell { background: rgba(255,255,255,0.01); border-color: rgba(255,255,255,0.07) !important; }
          .rbc-time-view .rbc-header { border-color: rgba(255,255,255,0.07) !important; }

          /* Hide default popup — popup={false} handles this at the component level */
          .rbc-overlay { display: none !important; }
          /* Agenda: hide default since we render custom */
          .rbc-agenda-view { display: none !important; }

          /* Drag and Drop — Enhanced UX */
          .rbc-addons-dnd-resizable {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.15s ease, opacity 0.15s ease;
          }

          /* Ghost preview while dragging */
          .rbc-addons-dnd-drag-preview {
            opacity: 0.45;
            transform: scale(1.04);
            box-shadow: 0 16px 48px rgba(124,58,237,0.6), 0 4px 12px rgba(0,0,0,0.5);
            border-radius: 10px !important;
            transition: none;
            z-index: 999;
            pointer-events: none;
          }

          /* Active drag cursor */
          .rbc-addons-dnd-dragger { cursor: grab !important; }
          .rbc-addons-dnd-dragger:active { cursor: grabbing !important; }

          /* Drop zone highlight when hovering over a valid slot */
          .rbc-day-slot .rbc-time-slot:hover,
          .rbc-day-bg:hover {
            background: rgba(124,58,237,0.1) !important;
            outline: 1.5px dashed rgba(167,139,250,0.5) !important;
            outline-offset: -2px;
            transition: background 0.15s;
          }

          /* Month row — flexible height, scrollable */
          .rbc-month-row {
            min-height: 150px !important;
            height: auto !important;
            max-height: 250px;
            overflow-y: auto !important;
            overflow-x: visible !important;
          }

          /* Day slot — scrollable for week/day views */
          .rbc-day-slot {
            overflow-y: auto;
          }

          /* Smooth all event transitions */
          .rbc-event {
            transition: transform 0.15s, opacity 0.15s !important;
            display: block !important;
          }
        `}</style>

        {view !== Views.AGENDA ? (
          <DnDCalendar
            localizer={localizer}
            events={displayEvents}
            startAccessor="start"
            endAccessor="end"
            titleAccessor="title"
            style={{ height: '620px' }}
            popup={false}
            components={{
              month: { event: ({ event }) => <EventCard key={(event as CalendarEvent).id} event={event as CalendarEvent} /> },
              week:  { event: ({ event }) => <WeekEventCard key={(event as CalendarEvent).id} event={event as CalendarEvent} /> },
              day:   { event: ({ event }) => <WeekEventCard key={(event as CalendarEvent).id} event={event as CalendarEvent} /> },
            }}
            resources={resources.length > 0 ? resources : undefined}
            resourceIdAccessor={(r: any) => r.resourceId}
            resourceTitleAccessor={(r: any) => r.resourceTitle}
            draggableAccessor={isDraggableAuth as any}
            resizableAccessor={() => false}
            onEventDrop={onEventDrop}
            onDropFromOutside={handleDropFromOutside}
            dragFromOutsideItem={() => {
              const id = (window as any).__draggedBookingId;
              return allEvents.find(e => e.id === id) || ({} as any);
            }}
            eventPropGetter={eventStyleGetter as any}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            view={view}
            onView={setView}
            defaultView={Views.MONTH}
            onShowMore={handleShowMore as any}
            onSelectEvent={handleSelectEvent as any}
            onDrillDown={handleDrillDown}
            onSelectSlot={handleSelectSlot as any}
            selectable
            dayLayoutAlgorithm={'no-overlap'}
            timeslots={1}
            scrollToTime={new Date(2000, 1, 1, 8, 0, 0)}
            formats={{ eventTimeRangeFormat: () => '' }}
            tooltipAccessor={null as any}
            messages={{ showMore: (count: number) => `+${count} bookings` }}
          />
        ) : (
          <div>
            {/* Agenda toolbar that mirrors RBC style */}
            <div className="rbc-toolbar mb-5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                <button className="rbc-btn-group" onClick={() => setView(Views.MONTH)}>Back</button>
              </div>
              <span className="rbc-toolbar-label text-white/90 font-bold text-sm">
                All upcoming appointments
              </span>
              <div className="flex gap-1.5">
                {([Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA] as View[]).map(v => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rbc-btn-group capitalize text-xs ${v === Views.AGENDA ? 'rbc-active' : ''}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {/* Custom agenda cards */}
            <div className="overflow-y-auto max-h-[520px] px-1">
              <CustomAgendaView events={allEvents} onSelectEvent={handleSelectEvent} />
            </div>
          </div>
        )}
      </div>

      {/* ── BACKDROP ── */}
      <AnimatePresence>
        {panel.open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          />
        )}
      </AnimatePresence>

      {/* ── RIGHT PANEL (desktop) / BOTTOM SHEET (mobile) ── */}
      <AnimatePresence>
        {panel.open && panel.date && (
          <motion.div
            ref={panelRef}
            key="side-panel"
            variants={isMobile ? mobilePanelVariants : desktopPanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed z-50 ${
              isMobile
                ? 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh] flex flex-col'
                : 'top-0 right-0 h-full w-[420px] flex flex-col'
            }`}
            style={{
              background: 'rgba(8,5,20,0.97)',
              backdropFilter: 'blur(40px) saturate(180%)',
              borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)',
              borderTop: isMobile ? '1px solid rgba(255,255,255,0.08)' : 'none',
              boxShadow: '-20px 0 80px rgba(0,0,0,0.5), 0 0 100px rgba(124,58,237,0.06)',
            }}
          >
            {/* ── Drag handle (mobile) ── */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
            )}

            {/* ── Panel Header ── */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-white/8 flex-shrink-0">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-400 text-xs font-bold uppercase tracking-[0.15em]">
                    {moment(panel.date).format('MMMM YYYY')}
                  </span>
                </div>
                <h2 className="text-white font-black text-2xl leading-none">
                  {moment(panel.date).format('dddd, Do')}
                </h2>
                <p className="text-white/30 text-xs mt-1">
                  {panel.events.length} appointment{panel.events.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={closePanel}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all flex-shrink-0 mt-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Booking List ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {panel.events.length === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                  <div className="text-4xl mb-4">✨</div>
                  <p className="text-white font-bold text-lg mb-1">No bookings today</p>
                  <p className="text-white/30 text-sm">Enjoy your free time!</p>
                </div>
              ) : (
                panel.events
                  .sort((a, b) => (a.start as Date).getTime() - (b.start as Date).getTime())
                  .map((event, i) => {
                    const appt = event.appointmentData;
                    const color = STATUS_COLOR[event.status] ?? '#a78bfa';
                    const bg = STATUS_BG[event.status] ?? 'rgba(167,139,250,0.1)';
                    const StatusIcon = STATUS_ICON[event.status] ?? Circle;
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.01]"
                        style={{
                          background: 'rgba(255,255,255,0.025)',
                          borderColor: `${color}22`,
                          boxShadow: `0 2px 20px ${color}08`,
                        }}
                      >
                        {/* Top row: Customer + Status */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0"
                              style={{ background: `${color}20`, color }}
                            >
                              {appt.name?.charAt(0)?.toUpperCase() || 'C'}
                            </div>
                            <span className="text-white font-bold text-sm truncate">{appt.name}</span>
                          </div>
                          <span
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex-shrink-0"
                            style={{ color, backgroundColor: bg, borderColor: `${color}35` }}
                          >
                            <StatusIcon className="w-2.5 h-2.5" />
                            {event.status}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="space-y-1.5 text-xs text-white/40">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-white/25 flex-shrink-0" />
                            <span className="font-semibold text-white/60">
                              {moment(event.start as Date).format('h:mm A')}
                              {appt.serviceDuration && ` · ${appt.serviceDuration} min`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Scissors className="w-3 h-3 text-white/25 flex-shrink-0" />
                            <span className="truncate">{appt.service}</span>
                          </div>
                          {appt.staffName && (
                            <div className="flex items-center gap-2">
                              <User className="w-3 h-3 text-white/25 flex-shrink-0" />
                              <span className="truncate">{appt.staffName}</span>
                            </div>
                          )}
                          {appt.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-white/25 flex-shrink-0" />
                              <span className="truncate">{appt.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Color accent strip */}
                        <div className="mt-3 h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, ${color}60, transparent)` }} />
                      </motion.div>
                    );
                  })
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-5 py-4 border-t border-white/6 flex-shrink-0">
              <button
                onClick={closePanel}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white/40 border border-white/8 hover:border-white/20 hover:text-white/60 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
