import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

// Helper to safely parse the private key
const formatPrivateKey = (key: string) => {
  return key.replace(/\\n/g, '\n');
};

const firebaseAdminConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY)
    : undefined,
};

export function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  if (
    !firebaseAdminConfig.projectId ||
    !firebaseAdminConfig.clientEmail ||
    !firebaseAdminConfig.privateKey
  ) {
    console.warn(
        'Firebase Admin config is missing. Please add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your .env.local'
    );
     // Fallback to default if credentials are not explicitly provided (e.g. deployed on Vercel with ADC)
    return initializeApp({
        projectId: firebaseAdminConfig.projectId,
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL
    });
  }

  return initializeApp({
    credential: cert(firebaseAdminConfig),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  });
}

export const adminAuth = getAuth(getFirebaseAdminApp());
export const adminDb = getDatabase(getFirebaseAdminApp());
