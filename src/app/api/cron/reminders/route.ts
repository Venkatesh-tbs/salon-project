import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { ref, get, child, update } from 'firebase/database';
import twilio from 'twilio';

// Use same Twilio credentials as confirmation notifications
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;
const salonGoogleReviewLink = "https://g.page/r/salon-luxe-review";

function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91') && digits.length === 13) return digits;
  if (digits.startsWith('91') && digits.length === 12)  return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11)   return '+91' + digits.slice(1);
  if (digits.length === 10)                             return '+91' + digits;
  return digits.startsWith('+') ? digits : '+' + digits;
}

/**
 * GET /api/cron/reminders
 *
 * Scans 'appointments' node in RTDB.
 * and hasn't had a reminder sent yet (reminderSent !== true),
 * it fires off a Twilio WhatsApp message and marks it as sent.
 * 
 * Also handles Delayed Google Review Requests:
 * If an appointment was completed at least 10 minutes ago and no review 
 * has been requested yet, it sends the review link via WhatsApp.
 * 
 * In production, trigger this via Vercel Cron or standard polling ping.
 */
export async function GET() {
  console.log('[Reminder] Endpoint triggered');
  console.log('[Reminder] Checking appointments');

  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'appointments'));

    if (!snapshot.exists()) {
      return NextResponse.json({ success: true, message: 'No appointments found' });
    }

    const appointments = snapshot.val();
    const now = new Date();
    const remindersSent: string[] = [];
    const errors: string[] = [];

    // Initialize Twilio client if credentials exist
    let twilioClient: twilio.Twilio | null = null;
    if (accountSid && authToken) {
      twilioClient = twilio(accountSid, authToken);
    } else {
      console.warn('[Reminder Cron] ⚠️ Twilio credentials missing. Running in mock mode.');
    }

    // Process each appointment securely
    for (const [id, data] of Object.entries(appointments)) {
      const appt = data as any;
      const phoneRaw = appt.phone;
      const formattedPhone = formatPhoneNumber(phoneRaw);
      const recipient = formattedPhone.startsWith('whatsapp:') ? formattedPhone : `whatsapp:${formattedPhone}`;

      // --- DISPATCH 1: WhatsApp Reminders (Future only, within 60 mins) ---
      if (appt.status === 'pending' || appt.status === 'confirmed') {
        if (appt.reminderSent !== true) {
          const apptDateStr = `${appt.date}T${appt.time}:00`;
          const apptTime = new Date(apptDateStr);
          
          if (!isNaN(apptTime.getTime())) {
            const msDiff = apptTime.getTime() - now.getTime();
            const minutesUntil = Math.floor(msDiff / 1000 / 60);

            if (minutesUntil > 0 && minutesUntil <= 60) {
              console.log(`[Reminder] Appointment within reminder window: ${appt.name} at ${appt.time} (${minutesUntil} mins)`);
              
              try {
                const reminderMsg = `Reminder ⏰\n\nHello ${appt.name} 👋\nYour appointment is today at ${appt.time}.\n\nSalon Luxe ✂️`;

                if (twilioClient && twilioWhatsApp) {
                  await twilioClient.messages.create({ body: reminderMsg, from: twilioWhatsApp, to: recipient });
                  console.log('[Reminder] Reminder sent successfully');
                } else {
                  console.log(`[Reminder] Mock reminder (no credentials) to ${recipient}`);
                }

                await update(ref(db, `appointments/${id}`), { reminderSent: true });
                remindersSent.push(id);
              } catch (err: any) {
                console.error(`[Reminder] Error sending to ${id}:`, err.message);
              }
            } else if (minutesUntil <= 0) {
                // Past appointment - skip silently or log for expired
                console.log(`[Reminder] Skipping past appointment: ${appt.name} at ${appt.time}`);
            }
          }
        } else if (appt.reminderSent === true) {
            // Already sent
            console.log('[Reminder] Reminder skipped (already sent)');
        }
      }

      // --- DISPATCH 2: Delayed Google Reviews (10 mins after completion) ---
      if (appt.status === 'completed' && appt.reviewRequested !== true) {
        const completedAt = appt.updatedAt || appt.createdAt; // Fallback if updatedAt missing
        const msSinceCompletion = now.getTime() - completedAt;
        const minutesSince = Math.floor(msSinceCompletion / 1000 / 60);

        if (minutesSince >= 10) {
          console.log(`[Review] Scheduling review message for ${appt.name} (completed ${minutesSince} mins ago)`);
          
          try {
            const reviewMsg = `Hello ${appt.name} 👋\nHope you loved your haircut today.\n\nPlease leave us a review:\n${salonGoogleReviewLink}\n\nSalon Luxe ✂️`;

            if (twilioClient && twilioWhatsApp) {
              await twilioClient.messages.create({ body: reviewMsg, from: twilioWhatsApp, to: recipient });
              console.log(`[Review] Review request sent successfully to ${recipient}`);
            } else {
              console.log(`[Review] Mock review request (no credentials) to ${recipient}`);
            }

            await update(ref(db, `appointments/${id}`), { reviewRequested: true });
          } catch (err: any) {
            console.error(`[Review] Error sending to ${id}:`, err.message);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      checkedAppointments: Object.keys(appointments).length,
      remindersSent: remindersSent.length
    });

  } catch (error: any) {
    console.error('[Reminder Cron] Fatal error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process reminders' }, { status: 500 });
  }
}
