import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';

let app: FirebaseApp;
let firestoreDb: Firestore;
let auth: Auth;
let rtdb: Database;

export function initializeFirebase() {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  firestoreDb = getFirestore(app);
  auth = getAuth(app);
  rtdb = getDatabase(app);
  return { app, db: firestoreDb, auth, rtdb };
}

// Export the Realtime Database instance as 'db' for direct usage:
// import { db } from '@/firebase'
export function getRealtimeDB(): Database {
  if (!rtdb) {
    const { rtdb: r } = initializeFirebase();
    return r;
  }
  return rtdb;
}

// Named export so: import { db } from '@/firebase' works
export const db = (() => {
  if (getApps().length === 0) {
    const a = initializeApp(firebaseConfig);
    return getDatabase(a);
  }
  return getDatabase(getApp());
})();

export const storage = (() => {
  if (getApps().length === 0) {
    const a = initializeApp(firebaseConfig);
    return getStorage(a);
  }
  return getStorage(getApp());
})();

export {
  FirebaseProvider,
  useFirebase,
  useFirebaseApp,
  useFirestore,
  useAuth,
  useRealtimeDB,
} from './provider';

export { FirebaseClientProvider } from './client-provider';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
export { useUser } from './auth/use-user';
