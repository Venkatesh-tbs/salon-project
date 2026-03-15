// ============================================================
// backend/src/services/whatsappService.ts
// Twilio WhatsApp messaging service
// ============================================================
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886";

export interface BookingConfirmationData {
  clientName: string;
  clientPhone: string;
  serviceName: string;
  staffName: string;
  date: string;
  time: string;
}

/**
 * Send booking confirmation via WhatsApp
 */
export async function sendBookingConfirmation(data: BookingConfirmationData): Promise<void> {
  const message = `Hello ${data.clientName}! 👋

Your appointment is confirmed ✅

💇 *Service:* ${data.serviceName}
👤 *Stylist:* ${data.staffName}
📅 *Date:* ${data.date}
⏰ *Time:* ${data.time}

We look forward to seeing you!

_Salon Luxé ✂️_
_Reply CANCEL to cancel your appointment_`;

  await client.messages.create({
    from: FROM,
    to: `whatsapp:${normalizePhone(data.clientPhone)}`,
    body: message,
  });

  console.log(`[WhatsApp] Confirmation sent to ${data.clientPhone}`);
}

/**
 * Send 1-hour reminder
 */
export async function sendReminder(data: BookingConfirmationData): Promise<void> {
  const message = `⏰ *Reminder — Salon Luxé*

Hi ${data.clientName}! Your *${data.serviceName}* appointment is in 1 hour.

🕐 *Time:* ${data.time}
👤 *Stylist:* ${data.staffName}

See you soon! ✂️`;

  await client.messages.create({
    from: FROM,
    to: `whatsapp:${normalizePhone(data.clientPhone)}`,
    body: message,
  });

  console.log(`[WhatsApp] Reminder sent to ${data.clientPhone}`);
}

/**
 * Send cancellation message
 */
export async function sendCancellation(
  clientName: string,
  clientPhone: string,
  date: string,
  time: string
): Promise<void> {
  const message = `Hi ${clientName},

Your appointment on *${date}* at *${time}* has been cancelled.

To rebook, visit our website or call us.

_Salon Luxé ✂️_`;

  await client.messages.create({
    from: FROM,
    to: `whatsapp:${normalizePhone(clientPhone)}`,
    body: message,
  });
}

// Ensure phone starts with country code
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}
