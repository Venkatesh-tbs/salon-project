// ============================================================
// backend/src/services/slotEngine.ts
// Smart time slot generation engine
// ============================================================
import { db } from "../config/firebase";
import { COLLECTIONS } from "../models/firestoreSchema";

export interface GeneratedSlot {
  time: string;         // "10:00"
  available: boolean;
  bookingId?: string;
}

/**
 * Generate all slots for a given staff + date + service.
 * Blocks slots that overlap with existing bookings.
 */
export async function generateSlots(
  staffId: string,
  date: string,          // "YYYY-MM-DD"
  serviceDuration: number // minutes
): Promise<GeneratedSlot[]> {

  // 1. Fetch staff availability for this day
  const staffDoc = await db.collection(COLLECTIONS.STAFF).doc(staffId).get();
  if (!staffDoc.exists) throw new Error("Staff not found");

  const staff = staffDoc.data()!;
  const dayName = getDayName(date);
  const daySchedule = staff.availability?.[dayName];

  if (!daySchedule?.isOpen) return [];

  const startTime = daySchedule.startTime || "09:00";
  const endTime   = daySchedule.endTime   || "20:00";

  // 2. Fetch existing bookings for this staff + date
  const bookingsSnap = await db
    .collection(COLLECTIONS.APPOINTMENTS)
    .where("staffId", "==", staffId)
    .where("date", "==", date)
    .where("status", "in", ["pending", "confirmed"])
    .get();

  const bookedRanges: { start: number; end: number; bookingId: string }[] = [];
  bookingsSnap.forEach((doc) => {
    const b = doc.data();
    bookedRanges.push({
      start: timeToMinutes(b.startTime),
      end: timeToMinutes(b.startTime) + b.serviceDuration,
      bookingId: doc.id,
    });
  });

  // 3. Generate all slots within working hours
  const slots: GeneratedSlot[] = [];
  const start = timeToMinutes(startTime);
  const end   = timeToMinutes(endTime);
  const interval = 30; // 30-min grid

  for (let t = start; t + serviceDuration <= end; t += interval) {
    const slotEnd = t + serviceDuration;

    // Check if this slot overlaps any booked range
    const conflict = bookedRanges.find(
      (b) => t < b.end && slotEnd > b.start
    );

    slots.push({
      time: minutesToTime(t),
      available: !conflict,
      bookingId: conflict?.bookingId,
    });
  }

  return slots;
}

// ─── Helpers ─────────────────────────────────────────────────
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function getDayName(dateStr: string): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date(dateStr).getDay()];
}
