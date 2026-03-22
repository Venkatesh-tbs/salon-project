import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

// Ensure Firebase is initialized
function getFirebaseAuth() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getAuth(getApp());
}

export async function loginWithEmailFlow(email: string, password: string) {
  const auth = getFirebaseAuth();
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await userCredential.user.getIdToken();

  // Call our server route to establish the session cookie
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create session');
  }

  // Explicitly inject client cookie for HTTPS environments (Vercel)
  const safeEmail = encodeURIComponent(userCredential.user.email || '');
  document.cookie = `session_email=${safeEmail}; path=/; SameSite=None; Secure`;

  return userCredential.user;
}

export async function logoutFlow() {
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
  } catch {
    // already signed out
  }
  // Clear session cookie from server
  await fetch('/api/auth/session', { method: 'DELETE' });

  // Clear client cookie explicitly
  document.cookie = "session_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00; SameSite=None; Secure";
}
