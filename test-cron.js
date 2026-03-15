// test-cron.js
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, get, child, remove } = require("firebase/database");
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function formatTime(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dStr = `${yyyy}-${mm}-${dd}`;
  const hr = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const tStr = `${hr}:${min}`;
  return { date: dStr, time: tStr };
}

async function runTest() {
  const TEST_ID = "testBookingCron123";
  // Fallback testing number if TWILIO_WHATSAPP_NUMBER isn't set
  const TEST_PHONE = "+919876543210"; 
  
  try {
    const now = new Date();
    const future = new Date(now.getTime() + 45 * 60000); // 45 minutes ahead
    const { date, time } = await formatTime(future);
    
    console.log(`[Reminder Test] Calculated test time: ${date} ${time} (in 45 mins)`);

    const testAppointment = {
      name: "Automated Test User",
      phone: TEST_PHONE,
      service: "Haircut",
      date: date,
      time: time,
      status: "pending", 
      reminderSent: false,
      createdAt: now.getTime()
    };

    console.log(`[Reminder Test] Creating test appointment: ${TEST_ID}`);
    await set(ref(db, `appointments/${TEST_ID}`), testAppointment);
    
    console.log(`[Reminder Test] Triggering Cron endpoint: /api/cron/reminders`);
    const res = await fetch('http://localhost:3000/api/cron/reminders');
    const cronResult = await res.json();
    
    console.log(`[Reminder Test] Cron response:`, cronResult);
    
    if (cronResult.success && cronResult.appointmentsReminded?.includes(TEST_ID)) {
      console.log(`[Reminder Test] ✅ WhatsApp reminder sent successfully to ${TEST_ID}`);
    } else {
      console.error(`[Reminder Test] ❌ Test ID was not included in reminded appointments. Expected ${TEST_ID} but got: ${cronResult.appointmentsReminded}`);
    }

    const snapshot = await get(child(ref(db), `appointments/${TEST_ID}`));
    if (snapshot.exists()) {
      const updatedData = snapshot.val();
      if (updatedData.reminderSent === true) {
         console.log(`[Reminder Test] ✅ RTDB reminderSent flag correctly updated to true`);
      } else {
         console.error(`[Reminder Test] ❌ RTDB reminderSent flag was NOT updated!`);
      }
    }
  } catch (error) {
    console.error(`[Reminder Test] ❌ FATAL ERROR:`, error.message);
  } finally {
    console.log(`[Reminder Test] Cleaning up test appointment: ${TEST_ID}`);
    await remove(ref(db, `appointments/${TEST_ID}`));
    console.log(`[Reminder Test] Done. Exit.`);
    process.exit(0);
  }
}

runTest();
