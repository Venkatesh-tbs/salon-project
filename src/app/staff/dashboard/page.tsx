'use client';

import { useState, useEffect } from "react";
import { Appointment, subscribeToAppointments } from "@/firebase/db";
import { db } from "@/firebase";
import { AppointmentsTable } from "@/components/admin/appointments-table";

export default function StaffDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // In a real app, you'd get the staff ID from the authed user session.
  // For demo, we are showing all appointments, or filtering by a mock staff ID.
  // We'll update this once auth is fully integrated in the UI.

  useEffect(() => {
    const unsubscribe = subscribeToAppointments(db, (data) => {
      // Filter appointments assigned to the logged-in staff
      // const myAppointments = data.filter(a => a.staffId === currentStaffId);
      setAppointments(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-heading font-bold tracking-tight glow-text pb-1">My Schedule</h2>
        <p className="text-sm text-zinc-400 mt-1">View and manage your assigned appointments for today.</p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-heading font-semibold tracking-wide">Appointments</h3>
          <span className="text-xs text-zinc-400">{appointments.length} assigned</span>
        </div>
        
        <AppointmentsTable appointments={appointments} isLoading={loading} staffView={true} />
      </div>
    </div>
  );
}
