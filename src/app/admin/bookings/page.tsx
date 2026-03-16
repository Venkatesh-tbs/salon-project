'use client';

import { useState, useEffect } from "react";
import { Appointment, subscribeToAppointments } from "@/firebase/db";
import { db } from "@/firebase";
import { AppointmentsTable } from "@/components/admin/appointments-table";
import { CalendarView } from "@/components/admin/calendar-view";

export default function AdminBookingsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time RTDB subscription
  useEffect(() => {
    const unsubscribe = subscribeToAppointments(db, (data) => {
      setAppointments(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight glow-text pb-1">Bookings Management</h2>
        <p className="text-sm text-zinc-400 mt-1">Manage all appointments, assign staff, and track status.</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-heading font-semibold tracking-wide">All Appointments</h3>
        </div>
        <AppointmentsTable appointments={appointments} isLoading={loading} />
      </div>

      <div className="pt-8 border-t border-white/10 space-y-4">
        <div>
          <h3 className="text-xl font-heading font-semibold text-white">Calendar View</h3>
          <p className="text-sm text-white/40 mt-1">All appointments by date and time</p>
        </div>
        <CalendarView appointments={appointments} />
      </div>
    </div>
  );
}
