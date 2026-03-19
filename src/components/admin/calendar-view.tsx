'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { Calendar, momentLocalizer, Event, Views } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Appointment } from '@/firebase/db';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, Scissors, User, Phone,
  CheckCircle2, AlertCircle, XCircle, Circle,
  CalendarDays,
} from 'lucide-react';

const localizer = momentLocalizer(moment);

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
  const appt = event.appointmentData;
  const color = STATUS_COLOR[event.status] ?? '#a78bfa';
  return (
    <div
      className="group w-full rounded-lg px-2 py-1 text-[11px] leading-tight overflow-hidden transition-all duration-150 hover:scale-[1.02] cursor-pointer"
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

// ─── Timeline Event Card (Week / Day) ───────────────────────
function WeekEventCard({ event }: { event: CalendarEvent }) {
  const appt = event.appointmentData;
  const color = STATUS_COLOR[event.status] ?? '#a78bfa';
  return (
    <div
      className="group w-full h-full rounded-md px-1.5 py-1 leading-tight overflow-hidden transition-all duration-150 hover:scale-[1.01] cursor-pointer flex flex-col"
      style={{
        background: `${color}1A`,
        borderLeft: `3px solid ${color}`,
        color: color,
        borderTop: `1px solid ${color}30`,
        borderRight: `1px solid ${color}30`,
        borderBottom: `1px solid ${color}30`,
        minHeight: '22px'
      }}
      title={`${appt.name} · ${appt.service} · ${appt.time}`}
    >
      <div className="font-bold truncate text-white" style={{ fontSize: '11px' }}>{appt.name}</div>
      <div className="flex flex-col gap-0.5 mt-0.5 opacity-75 overflow-hidden text-[10px]">
        <span className="truncate flex items-center gap-1"><Clock className="w-[10px] h-[10px] flex-shrink-0" />{appt.time}</span>
        <span className="truncate flex items-center gap-1"><Scissors className="w-[10px] h-[10px] flex-shrink-0" />{appt.service}</span>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export function CalendarView({ appointments }: CalendarViewProps) {
  const [panel, setPanel] = useState<PanelState>({ open: false, date: null, events: [] });
  const [isMobile, setIsMobile] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    return appointments
      .filter(a => a.date && a.time)
      .map(a => {
        const [year, month, day] = a.date.split('-').map(Number);
        const [hour, minute] = a.time.split(':').map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(start.getTime() + (a.serviceDuration || 30) * 60_000);
        return {
          id: a.id!,
          title: `${a.name} – ${a.service}`,
          start,
          end,
          status: a.status,
          appointmentData: a,
        };
      });
  }, [appointments]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    const color = STATUS_COLOR[event.status] ?? '#a78bfa';
    return {
      style: {
        background: 'transparent',
        border: 'none',
        padding: '1px 2px',
        color: color,
      },
    };
  }, []);

  const openPanel = useCallback((date: Date, evts: CalendarEvent[]) => {
    setPanel({ open: true, date, events: evts });
  }, []);

  const closePanel = useCallback(() => {
    setPanel(prev => ({ ...prev, open: false }));
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
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
      <div className="rounded-2xl border border-white/10 overflow-hidden p-4 min-h-[620px]" style={{ background: 'rgba(255,255,255,0.02)' }}>
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
          .rbc-month-view { border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 12px; overflow: hidden; }
          .rbc-month-row { border-color: rgba(255,255,255,0.06) !important; }
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
          .rbc-row-segment { padding: 1px 3px; }
          .rbc-event { background: transparent !important; border: none !important; padding: 0 !important; box-shadow: none !important; border-radius: 8px; }
          .rbc-event:focus { outline: none; }
          .rbc-event-content { overflow: visible; }

          /* SHOW MORE LINK */
          .rbc-show-more {
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
          .rbc-time-view { border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 12px; overflow: hidden; }
          .rbc-time-header { border-color: rgba(255,255,255,0.07) !important; }
          .rbc-time-header-content { border-color: rgba(255,255,255,0.07) !important; }
          .rbc-time-content { border-color: rgba(255,255,255,0.07) !important; }
          .rbc-timeslot-group { border-color: rgba(255,255,255,0.04) !important; min-height: 44px; }
          .rbc-time-slot { border-color: rgba(255,255,255,0.03) !important; }
          .rbc-time-gutter .rbc-label { color: rgba(255,255,255,0.25); font-size: 10px; font-weight: 600; letter-spacing: 0.04em; padding-right: 10px; }
          .rbc-current-time-indicator { background: #a78bfa; height: 2px; box-shadow: 0 0 8px #a78bfa88; }
          .rbc-day-slot .rbc-time-slot { border-color: rgba(255,255,255,0.03) !important; }
          .rbc-allday-cell { background: rgba(255,255,255,0.01); border-color: rgba(255,255,255,0.07) !important; }
          .rbc-time-view .rbc-header { border-color: rgba(255,255,255,0.07) !important; }

          /* AGENDA VIEW */
          .rbc-agenda-view { border: 1px solid rgba(255,255,255,0.07) !important; border-radius: 12px; overflow: hidden; }
          .rbc-agenda-table { border-color: rgba(255,255,255,0.06) !important; width: 100%; }
          .rbc-agenda-table thead { background: rgba(255,255,255,0.03); }
          .rbc-agenda-table thead th { color: rgba(255,255,255,0.35) !important; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; padding: 10px 12px; }
          .rbc-agenda-date-cell, .rbc-agenda-time-cell, .rbc-agenda-event-cell {
            border-color: rgba(255,255,255,0.05) !important;
            color: rgba(255,255,255,0.65) !important;
            font-size: 13px;
            padding: 10px 12px !important;
            vertical-align: middle;
          }
          .rbc-agenda-row:hover td { background: rgba(255,255,255,0.02); }

          /* Hide default popup */
          .rbc-overlay { display: none !important; }
        `}</style>

        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          eventPropGetter={eventStyleGetter as any}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          defaultView={Views.MONTH}
          onShowMore={handleShowMore as any}
          onSelectEvent={handleSelectEvent as any}
          onDrillDown={handleDrillDown}
          onSelectSlot={handleSelectSlot as any}
          selectable
          tooltipAccessor={null as any}
          messages={{ showMore: (count: number) => `+${count} bookings` }}
          components={{
            month: { event: ({ event }) => <EventCard event={event as CalendarEvent} /> },
            week:  { event: ({ event }) => <WeekEventCard event={event as CalendarEvent} /> },
            day:   { event: ({ event }) => <WeekEventCard event={event as CalendarEvent} /> },
          }}
        />
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
