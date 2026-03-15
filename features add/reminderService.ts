// ============================================================
// backend/src/services/reminderService.ts
// Cron job — runs every 15 min, sends 1-hour ahead reminders
// ============================================================
import cron from "node-cron";
import { db } from "../config/firebase";
import { COLLECTIONS } from "../models/firestoreSchema";
import { sendReminder } from "./whatsappService";

export function startReminderCron(): void {
  // Run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      await processUpcomingReminders();
    } catch (err) {
      console.error("[ReminderCron] Error:", err);
    }
  });

  console.log("[ReminderCron] Started — checking every 15 minutes");
}

async function processUpcomingReminders(): Promise<void> {
  const now = new Date();
  const targetTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

  const todayStr = formatDate(now);
  const targetTimeStr = formatTime(targetTime);

  // Query appointments for today at target time
  const snap = await db
    .collection(COLLECTIONS.APPOINTMENTS)
    .where("date", "==", todayStr)
    .where("startTime", "==", targetTimeStr)
    .where("status", "==", "confirmed")
    .get();

  if (snap.empty) return;

  const promises = snap.docs.map(async (doc) => {
    const appt = doc.data();
    const reminderId = `${doc.id}_1hr`;

    // Check if reminder already sent
    const reminderDoc = await db.collection(COLLECTIONS.REMINDERS).doc(reminderId).get();
    if (reminderDoc.exists) return;

    // Send reminder
    await sendReminder({
      clientName:  appt.clientName,
      clientPhone: appt.clientPhone,
      serviceName: appt.serviceName,
      staffName:   appt.staffName,
      date:        appt.date,
      time:        appt.startTime,
    });

    // Mark reminder as sent
    await db.collection(COLLECTIONS.REMINDERS).doc(reminderId).set({
      bookingId: doc.id,
      sentAt: new Date().toISOString(),
      type: "1hr_before",
    });
  });

  await Promise.allSettled(promises);
  console.log(`[ReminderCron] Processed ${snap.size} appointments at ${targetTimeStr}`);
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`;
}
