import { NextResponse } from 'next/server';
import twilio from 'twilio';

/**
 * POST /api/test-whatsapp
 *
 * Sends a test WhatsApp message via Twilio to verify the integration.
 * Body: { to: "+919876543210" }   ← your personal WhatsApp number with country code
 *
 * Usage (curl):
 *   curl -X POST http://localhost:3000/api/test-whatsapp \
 *        -H "Content-Type: application/json" \
 *        -d '{"to":"+919876543210"}'
 */
export async function POST(req: Request) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_NUMBER; // e.g. whatsapp:+14155238886

  // ── Credential check ────────────────────────────────────────────
  if (!accountSid || !authToken || !from) {
    const missing = [
      !accountSid && 'TWILIO_ACCOUNT_SID',
      !authToken  && 'TWILIO_AUTH_TOKEN',
      !from       && 'TWILIO_WHATSAPP_NUMBER',
    ].filter(Boolean);

    console.warn('[WhatsApp Test] ❌ Missing env vars:', missing.join(', '));
    return NextResponse.json(
      { success: false, error: `Missing env vars: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  // ── Parse recipient ─────────────────────────────────────────────
  let body: any = {};
  try { body = await req.json(); } catch { /* body is optional */ }

  const to = body.to;
  if (!to) {
    return NextResponse.json(
      { success: false, error: 'Body must include "to" field with phone number (e.g. +919876543210)' },
      { status: 400 }
    );
  }

  const recipient = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  console.log('[WhatsApp Test] WhatsApp notification triggered');
  console.log(`[WhatsApp Test] Sending to: ${recipient} via ${from}`);

  // ── Send message ────────────────────────────────────────────────
  try {
    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      from,
      to: recipient,
      body: `✅ Test message from Salon Booking System\n\nHello! 👋 This confirms your WhatsApp integration is working correctly.\n\n💈 *Mens Salon*\nYour booking notifications are now active.`,
    });

    console.log('[WhatsApp Test] ✅ Message sent successfully! SID:', message.sid);
    return NextResponse.json({
      success: true,
      messageSid: message.sid,
      to: recipient,
      status: message.status,
    });

  } catch (error: any) {
    console.error('[WhatsApp Test] ❌ Twilio error:', error.message);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        // Common fixes:
        hint: error.code === 63007
          ? 'Recipient has not joined the Twilio sandbox. Ask them to send "join <sandbox-word>" to the Twilio sandbox number.'
          : error.code === 21211
          ? 'Invalid phone number format. Use E.164 format: +919876543210'
          : 'Check your Twilio credentials and sandbox settings.',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test-whatsapp
 * Quick status check — confirms env vars are present without sending a message.
 */
export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_WHATSAPP_NUMBER;

  const status = {
    TWILIO_ACCOUNT_SID:    accountSid ? `✅ set (${accountSid.substring(0, 6)}***)` : '❌ missing',
    TWILIO_AUTH_TOKEN:     authToken  ? '✅ set (***)' : '❌ missing',
    TWILIO_WHATSAPP_NUMBER: from      ? `✅ set (${from})` : '❌ missing',
    ready: !!(accountSid && authToken && from),
  };

  console.log('[WhatsApp Test] Status check:', status);
  return NextResponse.json(status);
}
