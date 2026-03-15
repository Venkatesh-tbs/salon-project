'use client';

import { useMemo } from 'react';
import { Calendar, momentLocalizer, Event } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Appointment } from '@/firebase/db';

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  appointments: Appointment[];
}

interface CalendarEvent extends Event {
  id: string;
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  pending: '#facc15',
  confirmed: '#60a5fa',
  completed: '#4ade80',
  cancelled: '#f87171',
};

export function CalendarView({ appointments }: CalendarViewProps) {
  const events = useMemo<CalendarEvent[]>(() => {
    return appointments
      .filter(a => a.date && a.time)
      .map(a => {
        const [year, month, day] = a.date.split('-').map(Number);
        const [hour, minute] = a.time.split(':').map(Number);
        const start = new Date(year, month - 1, day, hour, minute);
        const end = new Date(start.getTime() + 30 * 60 * 1000); // default 30 min
        return {
          id: a.id!,
          title: `${a.name} – ${a.service}`,
          start,
          end,
          status: a.status,
        };
      });
  }, [appointments]);

  const eventStyleGetter = (event: CalendarEvent) => {
    const color = STATUS_COLOR[event.status] ?? '#a78bfa';
    return {
      style: {
        backgroundColor: `${color}20`,
        border: `1px solid ${color}60`,
        color: color,
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        padding: '2px 6px',
      },
    };
  };

  return (
    <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden p-4 min-h-[600px]">
      <style>{`
        /* Override react-big-calendar light theme for dark UI */
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
        .rbc-show-more { color: #a78bfa; font-size: 11px; }
        .rbc-event:focus { outline: none; }
        .rbc-agenda-table { border-color: rgba(255,255,255,0.08); }
        .rbc-agenda-table thead { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.4); }
        .rbc-agenda-date-cell, .rbc-agenda-time-cell, .rbc-agenda-event-cell { border-color: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); }
      `}</style>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 580 }}
        eventPropGetter={eventStyleGetter as any}
        views={['month', 'week', 'day', 'agenda']}
        defaultView="month"
        popup
        tooltipAccessor={(event: any) => `${event.title}\nStatus: ${event.status}`}
      />
    </div>
  );
}
