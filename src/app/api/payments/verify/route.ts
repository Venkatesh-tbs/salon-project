import { NextResponse } from 'next/server';
import crypto from 'crypto';

const key_secret = process.env.RAZORPAY_SECRET;

export async function POST(req: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dummy } = await req.json();

    if (dummy || !key_secret) {
      console.warn('Razorpay credentials missing or dummy payment. Mocking verification.');
      return NextResponse.json({ success: true, dummy: true });
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', key_secret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Razorpay Verification Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
