'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Appointment } from '@/firebase/db';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Scissors, User, CheckCircle2, AlertCircle, Circle, XCircle } from 'lucide-react';

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  appointments: Appointment[];
}

interface CalendarEvent extends Event {
  id: string;
  status: string;
  appointmentData: Appointment;
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#facc15',
  confirmed: '#60a5fa',
  completed: '#4ade80',
  cancelled: '#f87171',
};

const STATUS_BG: Record<string, string> = {
  pending: 'rgba(250,204,21,0.1)',
  confirmed: 'rgba(96,165,250,0.1)',
  completed: 'rgba(74,222,128,0.1)',
  cancelled: 'rgba(248,113,113,0.1)',
};

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: AlertCircle,
  confirmed: Circle,
  completed: CheckCircle2,
  cancelled: XCircle,
};

interface DayPanelState {
  open: boolean;
  date: Date | null;
  events: CalendarEvent[];
}

// Custom Toolbar — hides the "Day" view button entirely
function CustomToolbar({ label, onNavigate, onView, view }: any) {
  const views = [
    { key: 'month', label: 'Month' },
    { key: 'week', label: 'Week' },
    { key: 'agenda', label: 'Agenda' },
  ];
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div className="flex items-center gap-1">
        <button
          onClick={() => onNavigate('TODAY')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
        >Today</button>
        <button
          onClick={() => onNavigate('PREV')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
        >‹</button>
        <button
          onClick={() => onNavigate('NEXT')}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)' }}
        >›</button>
      </div>
      <span className="text-white font-bold text-sm">{label}</span>
      <div className="flex items-center gap-1">
        {views.map(v => (
          <button
            key={v.key}
            onClick={() => onView(v.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: view === v.key ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
              color: view === v.key ? '#a78bfa' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${view === v.key ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
            }}
          >{v.label}</button>
        ))}
      </div>
    </div>
  );
}

export function CalendarView({ appointments }: CalendarViewProps) {
  const [panel, setPanel] = useState<DayPanelState>({ open: false, date: null, events: [] });
  const [isMobile, setIsMobile] = useState(false);

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
        const end = new Date(start.getTime() + (a.serviceDuration || 30) * 60 * 1000);
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

  const eventStyleGetter = (event: CalendarEvent) => {
    const color = STATUS_COLOR[event.status] ?? '#a78bfa';
    return {
      style: {
        backgroundColor: `${color}18`,
        border: `1px solid ${color}50`,
        color: color,
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: 600,
        padding: '2px 6px',
        cursor: 'pointer',
      },
    };
  };

  const handleShowMore = useCallback((evts: CalendarEvent[], date: Date) => {
    setPanel({ open: true, date, events: evts });
  }, []);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    const date = event.start as Date;
    const dayEvents = events.filter(e => {
      const d = e.start as Date;
      return d.toDateString() === date.toDateString();
    });
    setPanel({ open: true, date, events: dayEvents });
  }, [events]);

  // Intercept clicking on a day number or slot — show our premium panel
  const handleDrillDown = useCallback((date: Date) => {
    const dayEvents = events.filter(e => {
      const d = e.start as Date;
      return d.toDateString() === date.toDateString();
    });
    setPanel({ open: true, date, events: dayEvents });
  }, [events]);

  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    const dayEvents = events.filter(e => {
      const d = e.start as Date;
      return d.toDateString() === start.toDateString();
    });
    setPanel({ open: true, date: start, events: dayEvents });
  }, [events]);

  const closePanel = useCallback(() => {
    setPanel(prev => ({ ...prev, open: false }));
  }, []);

  const panelVariants = isMobile
    ? {
        hidden: { y: '100%', opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, damping: 28, stiffness: 300 } },
        exit: { y: '110%', opacity: 0, transition: { duration: 0.25 } },
      }
    : {
        hidden: { scale: 0.93, opacity: 0, y: 20 },
        visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring' as const, damping: 28, stiffness: 350 } },
        exit: { scale: 0.93, opacity: 0, y: 20, transition: { duration: 0.2 } },
      };

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden p-4 min-h-[600px] relative">
      <style>{`
        .rbc-calendar { background: transparent; color: rgba(255,255,255,0.85); }
        .rbc-header { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding: 10px 0; }
        .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: rgba(255,255,255,0.08); }
        .rbc-day-bg, .rbc-month-row { border-color: rgba(255,255,255,0.06); }
        .rbc-off-range-bg { background: rgba(0,0,0,0.2); }
        .rbc-today { background: rgba(123,47,247,0.08); }
        .rbc-date-cell { color: rgba(255,255,255,0.6); font-size: 12px; }
        .rbc-date-cell.rbc-now { font-weight: 700; color: #a78bfa; }
        .rbc-toolbar { margin-bottom: 16px; }
        .rbc-toolbar button { color: rgba(255,255,255,0.6); border-color: rgba(255,255,255,0.12); background: rgba(255,255,255,0.05); border-radius: 8px; padding: 6px 14px; font-size: 13px; transition: all 0.2s; }
        .rbc-toolbar button:hover, .rbc-toolbar button:focus { background: rgba(123,47,247,0.2); color: #a78bfa; border-color: rgba(123,47,247,0.4); }
        .rbc-toolbar button.rbc-active { background: rgba(123,47,247,0.3); color: #a78bfa; border-color: rgba(123,47,247,0.5); }
        .rbc-toolbar-label { color: rgba(255,255,255,0.9); font-weight: 700; font-size: 15px; }
        .rbc-time-slot { border-color: rgba(255,255,255,0.04); }
        .rbc-timeslot-group { border-color: rgba(255,255,255,0.06); }
        .rbc-time-gutter .rbc-label { color: rgba(255,255,255,0.3); font-size: 11px; }
        .rbc-allday-cell { background: rgba(255,255,255,0.02); }
        .rbc-show-more { color: #a78bfa; font-size: 11px; font-weight: 700; cursor: pointer; padding: 2px 6px; border-radius: 6px; transition: background 0.15s; }
        .rbc-show-more:hover { background: rgba(167,139,250,0.15); }
        .rbc-event:focus { outline: none; }
        .rbc-agenda-table { border-color: rgba(255,255,255,0.08); }
        .rbc-agenda-table thead { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.4); }
        .rbc-agenda-date-cell, .rbc-agenda-time-cell, .rbc-agenda-event-cell { border-color: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
        .rbc-overlay { display: none !important; }
      `}</style>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 580 }}
        eventPropGetter={eventStyleGetter as any}
        views={['month', 'week', 'agenda']}
        defaultView="month"
        onShowMore={handleShowMore as any}
        onSelectEvent={handleSelectEvent as any}
        onDrillDown={handleDrillDown}
        onSelectSlot={handleSelectSlot as any}
        selectable
        tooltipAccessor={null as any}
        components={{ toolbar: CustomToolbar }}
      />

      {/* Overlay backdrop */}
      <AnimatePresence>
        {panel.open && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            style={{ touchAction: 'none' }}
            onClick={closePanel}
          />
        )}
      </AnimatePresence>

      {/* Premium Panel */}
      <AnimatePresence>
        {panel.open && panel.date && (
          <motion.div
            key="panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`fixed z-50 ${
              isMobile
                ? 'bottom-0 left-0 right-0 rounded-t-3xl max-h-[85vh]'
                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-2xl'
            }`}
            style={{
              background: 'rgba(10,6,25,0.96)',
              backdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 120px rgba(124,58,237,0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle (mobile) */}
            {isMobile && (
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-[0.15em] font-bold mb-0.5">Appointments</p>
                <h3 className="text-white font-black text-lg">
                  {moment(panel.date).format('dddd, MMMM D')}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/40 font-semibold">
                  {panel.events.length} booking{panel.events.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={closePanel}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Booking Cards */}
            <div
              className="overflow-y-auto px-4 py-4 space-y-3"
              style={{ maxHeight: isMobile ? 'calc(85vh - 120px)' : '420px' }}
            >
              {panel.events.length === 0 ? (
                <div className="text-center py-12 text-white/30 text-sm">No appointments for this day.</div>
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
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="rounded-xl p-4 border flex items-start gap-3"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderColor: `${color}25`,
                        }}
                      >
                        {/* Color accent */}
                        <div
                          className="mt-0.5 w-1.5 h-full min-h-[40px] rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold text-sm truncate">{appt.name}</span>
                            <span
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex-shrink-0"
                              style={{ color, backgroundColor: bg, borderColor: `${color}40` }}
                            >
                              <StatusIcon className="w-2.5 h-2.5" />
                              {event.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/40">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {moment(event.start as Date).format('h:mm A')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Scissors className="w-3 h-3" />
                              {appt.service}
                            </span>
                            {appt.staffName && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {appt.staffName}
                              </span>
                            )}
                          </div>
                          {appt.notes && (
                            <p className="mt-1 text-white/25 text-xs italic truncate">{appt.notes}</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/8">
              <button
                onClick={closePanel}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white/50 border border-white/10 hover:border-white/20 hover:text-white/70 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
