import { NextResponse } from "next/server";
import { db } from "@/firebase";
import { ref, get } from "firebase/database";

export interface GeneratedSlot {
  time: string;         // "10:00"
  available: boolean;
  bookingId?: string;
}

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get("staffId");
  const date = searchParams.get("date");
  const serviceId = searchParams.get("serviceId");

  if (!staffId || !date || !serviceId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  try {
    // 1. Fetch staff availability
    const staffRef = ref(db, `staff/${staffId}`);
    const staffSnap = await get(staffRef);
    if (!staffSnap.exists()) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    // Check staff leave
    const leaveRef = ref(db, `staffLeaves/${staffId}/${date}`);
    const leaveSnap = await get(leaveRef);
    let isFullDayLeave = false;
    let partialLeaveRange: { start: number; end: number } | null = null;

    if (leaveSnap.exists()) {
      const leaveData = leaveSnap.val();
      const status = leaveData?.status || 'approved'; // Legacy leaves missing status assume approved

      if (status === 'approved') {
        if (leaveData === true || leaveData?.unavailable === true || leaveData?.type === 'full') {
          isFullDayLeave = true;
        } else if (leaveData?.type === 'partial' && leaveData.startTime && leaveData.endTime) {
          partialLeaveRange = {
            start: timeToMinutes(leaveData.startTime),
            end: timeToMinutes(leaveData.endTime),
          };
        }
      }
    }

    if (isFullDayLeave) {
      return NextResponse.json({ slots: [] }); // Return empty slots if full day leave
    }
    
    // In this mock adaptation, if availability is not explicitly defined, we assume 09:00 to 20:00 everyday.
    const staff = staffSnap.val();
    const dayName = getDayName(date);
    const daySchedule = staff.availability?.[dayName] || { isOpen: true, startTime: "09:00", endTime: "20:00" };

    if (!daySchedule?.isOpen) return NextResponse.json({ slots: [] });

    // Let's assume standard services take length based on service mapping.
    // In this demo, if we don't fetch the service, we default to 45 mins.
    const serviceRef = ref(db, `services/${serviceId}`);
    const serviceSnap = await get(serviceRef);
    let serviceDuration = 45; // default fallback
    if (serviceSnap.exists()) {
      serviceDuration = serviceSnap.val().duration || 45;
    }

    const startTime = daySchedule.startTime || "09:00";
    const endTime   = daySchedule.endTime   || "20:00";

    // 2. Fetch bookings to find overlaps
    const appointmentsRef = ref(db, "appointments");
    const bookingsSnap = await get(appointmentsRef);
    
    const bookedRanges: { start: number; end: number; bookingId: string }[] = [];
    
    if (bookingsSnap.exists()) {
       const allAppts = bookingsSnap.val();
       for (const [id, a] of Object.entries<any>(allAppts)) {
         if (a.staffId === staffId && a.date === date && ["pending", "confirmed"].includes(a.status)) {
            // Assume end time is stored or calculate it from start time
            let apptDur = Number(a.serviceDuration);
            if (!apptDur || isNaN(apptDur)) {
               // Try to match it manually if missing
               apptDur = 45; // fallback
            }
            if (a.time) { // Note we use "time" in initial form instead of startTime 
              const startMin = timeToMinutes(a.time);
              bookedRanges.push({
                start: startMin,
                end: startMin + apptDur,
                bookingId: id
              });
            }
         }
       }
    }

    // 3. Generate slots
    const slots: GeneratedSlot[] = [];
    const start = timeToMinutes(startTime);
    const end   = timeToMinutes(endTime);
    const interval = 30; // 30 min grid

    // Hardcoded breaks per user instruction
    const lunchStart = timeToMinutes("13:00");
    const lunchEnd   = timeToMinutes("14:00");
    const breakStart = timeToMinutes("17:00");
    const breakEnd   = timeToMinutes("17:30");

    for (let t = start; t + serviceDuration <= end; t += interval) {
      const slotEnd = t + serviceDuration;
      
      const conflict = bookedRanges.find((b) => t < b.end && slotEnd > b.start);
      const partialConflict = partialLeaveRange && (t < partialLeaveRange.end && slotEnd > partialLeaveRange.start);
      const lunchConflict = (t < lunchEnd && slotEnd > lunchStart);
      const breakConflict = (t < breakEnd && slotEnd > breakStart);

      slots.push({
        time: minutesToTime(t),
        available: !conflict && !partialConflict && !lunchConflict && !breakConflict,
        bookingId: conflict?.bookingId,
      });
    }

    return NextResponse.json({ slots });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
