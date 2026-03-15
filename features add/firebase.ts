// ============================================================
// backend/src/config/firebase.ts
// Firebase Admin SDK — singleton initializer
// ============================================================
import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || "./serviceAccountKey.json";

if (!admin.apps.length) {
  const resolved = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Firebase service account not found at: ${resolved}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const db = admin.firestore();
export const storage = admin.storage();
export default admin;
