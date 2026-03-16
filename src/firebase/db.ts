'use client';

import {
  Database,
  ref,
  push,
  set,
  get,
  update,
  remove,
  onValue,
  off,
} from 'firebase/database';

// ─── TYPES ─────────────────────────────────────────────────────

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface Appointment {
  id?: string;
  name: string;
  phone: string;
  service: string;
  servicePrice?: number;
  serviceDuration?: number;
  staffId?: string;
  staffName?: string;
  date: string;
  time: string;
  notes?: string;
  status: AppointmentStatus;
  email?: string;
  paymentId?: string | null;
  paymentStatus?: 'paid' | 'unpaid';
  reminderSent?: boolean;
  createdAt: number;
}

export interface Client {
  id?: string;        // phone number used as key
  name: string;
  phone: string;
  totalVisits: number;
  lastVisitDate: string; // e.g. '2026-03-14'
  loyaltyPoints?: number;
  totalSpent?: number;
}

export interface Service {
  id?: string;
  name: string;
  duration: number;  // minutes
  price: number;     // ₹
  icon?: string;     // icon key for UI
}

// ─── APPOINTMENTS ───────────────────────────────────────────────

/**
 * Save a new appointment to Firebase Realtime Database under 'appointments/'.
 * Returns the auto-generated appointment ID.
 */
export async function saveAppointmentRTDB(
  rtdb: Database,
  data: Omit<Appointment, 'id' | 'status' | 'createdAt'>
): Promise<string> {
  const appointmentsRef = ref(rtdb, 'appointments');
  const newRef = push(appointmentsRef);
  const payload: Omit<Appointment, 'id'> = {
    ...data,
    status: 'pending',
    createdAt: Date.now(),
  };
  await set(newRef, payload);
  return newRef.key!;
}

/**
 * Subscribe to real-time appointment updates from 'appointments/'.
 * Returns an unsubscribe function.
 */
export function subscribeToAppointments(
  rtdb: Database,
  callback: (appointments: Appointment[]) => void
): () => void {
  const appointmentsRef = ref(rtdb, 'appointments');
  const listener = onValue(appointmentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const result: Appointment[] = [];
    snapshot.forEach((child) => {
      result.push({ id: child.key!, ...child.val() } as Appointment);
    });
    // Sort newest first
    callback(result.sort((a, b) => b.createdAt - a.createdAt));
  });
  return () => off(appointmentsRef, 'value', listener);
}

/**
 * Subscribe to appointments assigned to a specific staff member.
 * Optionally filter by date (YYYY-MM-DD format).
 */
export function subscribeToStaffAppointments(
  rtdb: Database,
  staffId: string,
  callback: (appointments: Appointment[]) => void,
  dateFilter?: string
): () => void {
  const appointmentsRef = ref(rtdb, 'appointments');
  const listener = onValue(appointmentsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const result: Appointment[] = [];
    snapshot.forEach((child) => {
      const appt = { id: child.key!, ...child.val() } as Appointment;
      if (appt.staffId === staffId) {
        if (!dateFilter || appt.date === dateFilter) {
          result.push(appt);
        }
      }
    });
    // Sort by time
    callback(result.sort((a, b) => a.time.localeCompare(b.time)));
  });
  return () => off(appointmentsRef, 'value', listener);
}

/**
 * Update the status of an appointment.
 */
export async function updateAppointmentStatusRTDB(
  rtdb: Database,
  id: string,
  status: AppointmentStatus
): Promise<void> {
  const appointmentRef = ref(rtdb, `appointments/${id}`);
  await update(appointmentRef, { status });
}

/**
 * Delete an appointment by ID.
 */
export async function deleteAppointmentRTDB(
  rtdb: Database,
  id: string
): Promise<void> {
  const appointmentRef = ref(rtdb, `appointments/${id}`);
  await remove(appointmentRef);
}

// ─── CLIENTS ────────────────────────────────────────────────────

/**
 * Upsert a client record when an appointment is completed.
 * Uses phone number (sanitized) as the Firebase key.
 */
export async function upsertClient(
  rtdb: Database,
  phone: string,
  name: string,
  visitDate: string
): Promise<void> {
  // Use sanitized phone as key (remove non-alphanumeric chars)
  const key = phone.replace(/\D/g, '');
  const clientRef = ref(rtdb, `clients/${key}`);

  const snapshot = await get(clientRef);
  if (snapshot.exists()) {
    const existing = snapshot.val() as Client;
    await update(clientRef, {
      name,
      totalVisits: (existing.totalVisits || 0) + 1,
      lastVisitDate: visitDate,
    });
  } else {
    await set(clientRef, {
      name,
      phone,
      totalVisits: 1,
      lastVisitDate: visitDate,
    } satisfies Omit<Client, 'id'>);
  }
}

/**
 * Subscribe to real-time client updates from 'clients/'.
 * Returns an unsubscribe function.
 */
export function subscribeToClients(
  rtdb: Database,
  callback: (clients: Client[]) => void
): () => void {
  const clientsRef = ref(rtdb, 'clients');
  const listener = onValue(clientsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const result: Client[] = [];
    snapshot.forEach((child) => {
      result.push({ id: child.key!, ...child.val() } as Client);
    });
    // Sort by most visits
    callback(result.sort((a, b) => b.totalVisits - a.totalVisits));
  });
  return () => off(clientsRef, 'value', listener);
}

// ─── SERVICES ───────────────────────────────────────────────────

const DEFAULT_SERVICES: Omit<Service, 'id'>[] = [
  { name: 'Haircut & Styling', duration: 30, price: 200, icon: 'scissors' },
  { name: 'Beard Trim & Shape', duration: 15, price: 100, icon: 'blade' },
  { name: 'Hair Coloring', duration: 90, price: 1200, icon: 'palette' },
  { name: 'Facial Treatment', duration: 45, price: 500, icon: 'droplets' },
  { name: 'Head Massage', duration: 20, price: 150, icon: 'sparkle' },
  { name: 'Waxing', duration: 30, price: 300, icon: 'flame' },
];

/**
 * Initialize default services in Firebase if the node is empty.
 */
export async function initDefaultServices(rtdb: Database): Promise<void> {
  const servicesRef = ref(rtdb, 'services');
  const snapshot = await get(servicesRef);
  if (!snapshot.exists()) {
    for (const service of DEFAULT_SERVICES) {
      const newRef = push(servicesRef);
      await set(newRef, service);
    }
  }
}

/**
 * Subscribe to real-time service updates from 'services/'.
 * Returns an unsubscribe function.
 */
export function subscribeToServices(
  rtdb: Database,
  callback: (services: Service[]) => void
): () => void {
  const servicesRef = ref(rtdb, 'services');
  const listener = onValue(servicesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const result: Service[] = [];
    snapshot.forEach((child) => {
      result.push({ id: child.key!, ...child.val() } as Service);
    });
    callback(result);
  });
  return () => off(servicesRef, 'value', listener);
}

// ─── LEGACY FIRESTORE STUBS (kept for backwards compat) ─────────
// These keep old imports from breaking during migration.
import type { Firestore } from 'firebase/firestore';

export interface Booking {
  id?: string;
  name: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  notes?: string;
  createdAt: number;
}

export function saveAppointment(_db: Firestore, _data: any) { /* noop */ }
export function updateAppointment(_db: Firestore, _id: string, _data: any) { /* noop */ }
export function deleteAppointment(_db: Firestore, _id: string) { /* noop */ }
export async function getAllAppointments(_db: Firestore): Promise<Appointment[]> { return []; }
export async function saveBooking(_rtdb: Database, _data: any): Promise<string> { return ''; }