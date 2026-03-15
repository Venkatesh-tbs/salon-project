import { NextResponse } from 'next/server';
import { db } from '@/firebase';
import { ref, get, update, child } from 'firebase/database';
import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER;
const salonGoogleReviewLink = "https://g.page/r/salon-luxe-review"; // Replace with real link

function formatPhoneNumber(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/[\s\-().]/g, '');
  if (digits.startsWith('+91') && digits.length === 13) return digits;
  if (digits.startsWith('91') && digits.length === 12)  return '+' + digits;
  if (digits.startsWith('0') && digits.length === 11)   return '+91' + digits.slice(1);
  if (digits.length === 10)                             return '+91' + digits;
  return digits.startsWith('+') ? digits : '+' + digits;
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const apptRef = ref(db, `appointments/${id}`);
    const snapshot = await get(apptRef);

    if (!snapshot.exists()) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    const appt = snapshot.val();
    const isAdvancingToCompleted = appt.status !== 'completed' && status === 'completed';

    // 1. Update appointment status
    await update(apptRef, { 
      status, 
      updatedAt: Date.now() 
    });

    // 2. Feature 2 & 3: Trigger Loyalty and Reviews if marked completed
    if (isAdvancingToCompleted) {
      const phoneRaw = appt.phone;
      const formattedPhone = formatPhoneNumber(phoneRaw);
      
      // -- Feature 2: Loyalty Points & Total Spent --
      console.log(`[Loyalty] Updating client loyalty data for ${appt.name}`);
      const phoneId = formattedPhone.replace('+', ''); 
      const clientRef = ref(db, `clients/${phoneId}`);
      const clientSnap = await get(clientRef);
      
      let currentPoints = 0;
      let totalVisits = 0;
      let totalSpent = 0;
      
      if (clientSnap.exists()) {
        const clientData = clientSnap.val();
        currentPoints = clientData.loyaltyPoints || 0;
        totalVisits = clientData.totalVisits || 0;
        totalSpent = clientData.totalSpent || 0;
      }
      
      const price = Number(appt.servicePrice) || 0;
      const pointsEarned = price > 500 ? 10 : 5; 
      
      await update(clientRef, {
        name: appt.name,
        phone: formattedPhone,
        totalVisits: totalVisits + 1,
        loyaltyPoints: currentPoints + pointsEarned,
        totalSpent: totalSpent + price,
        lastVisit: Date.now()
      });

      console.log(`[Loyalty] Points added successfully: +${pointsEarned} (Total: ${currentPoints + pointsEarned}), +₹${price} Spent`);

      // -- Feature 3: Scheduled Review Request --
      console.log(`[Review] Appointment completed for ${appt.name}. Review request scheduled (10 min delay).`);
      // Note: Logic moved to /api/cron/reminders for reliable delay.
    }

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error('[Admin Status Update] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
