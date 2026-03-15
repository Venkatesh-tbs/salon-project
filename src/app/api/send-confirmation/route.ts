import { NextResponse } from 'next/server';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
// Twilio sandbox number
const twilioWhatsApp = 'whatsapp:+14155238886'; 

export async function POST(req: Request) {
  try {
    const { phone, name, service, date, time } = await req.json();

    if (!phone || !name || !date || !time || !service) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!accountSid || !authToken) {
      console.error('[Twilio] Missing Twilio credentials');
      return NextResponse.json({ error: 'Missing Twilio credentials' }, { status: 500 });
    }

    const message = `Hello ${name} 👋

Your appointment at Salon Luxé is confirmed ✅

💇 Service: ${service}
📅 Date: ${date}
⏰ Time: ${time}

See you soon ✂`;

    // Extract digits only and prepend country code if needed
    const digits = phone.replace(/[\s\-().+]/g, '');
    let e164 = digits;
    if (digits.length === 10) e164 = '91' + digits;
    
    const recipient = `whatsapp:+${e164}`;

    console.log(`[Twilio Confirmation] Sending to ${recipient}`);

    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: twilioWhatsApp,
      to: recipient,
    });

    console.log('[Twilio Confirmation] Message sent successfully. SID:', result.sid);
    return NextResponse.json({ success: true, messageSid: result.sid });

  } catch (error: any) {
    console.error('[Twilio Confirmation Error]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
