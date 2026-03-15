import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid    = process.env.TWILIO_ACCOUNT_SID;
const authToken     = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER; // e.g. whatsapp:+14155238886

export async function POST(req: Request) {
  try {
    const { to, name, date, time, service, staffName } = await req.json();

    if (!to || !name || !date || !time || !service) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Format the message per the required spec
    const stylist = staffName && staffName !== 'Unassigned' ? staffName : 'Our Expert';

    const message =
`Hello ${name} 👋

Your appointment is confirmed. ✅

Service: ${service}
Stylist: ${stylist}
Date: ${date}
Time: ${time}

Salon Luxe ✂️

Need to reschedule? Call us at least 2 hours before your appointment.`;

    if (!accountSid || !authToken || !twilioWhatsApp) {
      console.warn('[WhatsApp] Twilio credentials missing. Logging confirmation locally:');
      console.log(`📱 To: ${to}\n${message}`);
      return NextResponse.json({ success: true, dummy: true, message });
    }

    // Ensure proper whatsapp: prefix on recipient number
    const recipient = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    console.log(`[WhatsApp] Sending confirmation to ${recipient}`);

    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: twilioWhatsApp,
      to: recipient,
    });

    console.log('[WhatsApp] Message sent successfully. SID:', result.sid);
    return NextResponse.json({ success: true, messageSid: result.sid });

  } catch (error: any) {
    // Non-fatal: always return 200 so booking is never blocked
    console.error('[WhatsApp] Send failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 200 });
  }
}
