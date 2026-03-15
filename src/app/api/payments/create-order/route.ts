import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { v4 as uuid } from 'uuid';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_SECRET;

export async function POST(req: Request) {
  try {
    const { amount, bookingId, currency = 'INR', notes } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Dev fallback: mock order when credentials are missing
    if (!key_id || !key_secret) {
      console.warn('[Razorpay] Credentials missing — returning mock order for development.');
      return NextResponse.json({
        id: `order_dummy_${uuid().replace(/-/g, '').substring(0, 14)}`,
        amount: Math.round(amount * 100), // paise
        currency,
        receipt: bookingId || uuid(),
        dummy: true,
      });
    }

    const razorpay = new Razorpay({ key_id, key_secret });
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency,
      receipt: bookingId || uuid(),
      notes: notes || {},
    });

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('[Razorpay] Create order error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
