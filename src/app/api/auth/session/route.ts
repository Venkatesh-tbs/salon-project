import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Use the exact key from the Firebase Console screenshot, hardcoded to avoid Vercel env bugs
const FIREBASE_API_KEY = 'AIzaSyCO68BSWyverNAl_hD9Egkzx1Zvhw-o4tk';

async function verifyIdToken(idToken: string): Promise<{ uid: string; email: string } | null> {
  try {
    // Use Firebase REST API to verify the ID token
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.users?.[0];
    return user ? { uid: user.localId, email: user.email } : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
    }

    // Verify with Firebase REST API (no Admin SDK needed)
    const user = await verifyIdToken(idToken);
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Store in a simple cookie (5 day expiry)
    const expiresIn = 60 * 60 * 24 * 5; // seconds
    const cookieStore = await cookies();
    cookieStore.set('session', idToken, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    // Also store the email to identify role on client
    cookieStore.set('session_email', user.email, {
      maxAge: expiresIn,
      httpOnly: false, // readable by JS for role checking
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ status: 'success', email: user.email }, { status: 200 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    cookieStore.delete('session_email');
    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Error removing session:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
