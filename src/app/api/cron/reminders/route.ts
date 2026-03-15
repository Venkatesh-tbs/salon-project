import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { ref, get, child, update } from 'firebase/database';
import twilio from 'twilio';
import { parse, differenceInMinutes, parseISO } from 'date-fns';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsApp = 'whatsapp:+14155238886'; 

export async function GET(req: Request) {
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'appointments'));

    if (!snapshot.exists()) {
      return NextResponse.json({ success: true, message: 'No appointments found' });
    }

    const appointments = snapshot.val();
    const now = new Date();
    
    let twilioClient;
    if (accountSid && authToken) {
      twilioClient = twilio(accountSid, authToken);
    } else {
      console.warn('[Reminders] Missing Twilio credentials');
    }

    let sentCount = 0;

    for (const [id, appt] of Object.entries(appointments)) {
      const data = appt as any;
      
      // Only remind confirmed appointments that haven't had a reminder sent yet
      if (data.status === 'confirmed' && !data.reminderSent) {
        
        // Parse the appointment datetime
        // Assuming date is "YYYY-MM-DD" and time is "HH:mm" (24h)
        const dateStr = `${data.date}T${data.time}:00`;
        const apptTime = parseISO(dateStr);
        
        if (!isNaN(apptTime.getTime())) {
          const minutesUntil = differenceInMinutes(apptTime, now);

          // If the appointment is within the next 60 minutes
          if (minutesUntil > 0 && minutesUntil <= 60) {
            console.log(`[Reminders] Sending reminder for ${data.name} (in ${minutesUntil} mins)`);

            const message = `Reminder ⏰

Hi ${data.name} 👋

Your appointment at Salon Luxé is in 1 hour.

💇 Service: ${data.service}
⏰ Time: ${data.time}

Please arrive on time. See you soon ✂`;

            const digits = data.phone.replace(/[\s\-().+]/g, '');
            let e164 = digits;
            if (digits.length === 10) e164 = '91' + digits;
            const recipient = `whatsapp:+${e164}`;

            if (twilioClient) {
              try {
                await twilioClient.messages.create({
                  body: message,
                  from: twilioWhatsApp,
                  to: recipient,
                });

                // Update database to mark reminder as sent
                await update(ref(db, `appointments/${id}`), { reminderSent: true });
                sentCount++;
              } catch (twError: any) {
                console.error(`[Reminders] Failed to send to ${recipient}:`, twError.message);
              }
            } else {
              // Mock execution
              await update(ref(db, `appointments/${id}`), { reminderSent: true });
              sentCount++;
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, remindersSent: sentCount }, { status: 200 });
  } catch (error: any) {
    console.error('[Reminders] Error running cron job:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
