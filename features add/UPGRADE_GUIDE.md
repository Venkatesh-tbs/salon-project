# Salon Booking System — Full Upgrade Guide

## Files Modified vs New

### NEW Backend Files
```
backend/
├── src/
│   ├── config/
│   │   ├── firebase.ts          ← Firebase Admin SDK init
│   │   └── razorpay.ts          ← Razorpay init
│   ├── controllers/
│   │   ├── staffController.ts
│   │   ├── slotController.ts
│   │   ├── crmController.ts
│   │   ├── revenueController.ts
│   │   ├── galleryController.ts
│   │   └── paymentController.ts
│   ├── middleware/
│   │   └── auth.ts
│   ├── models/
│   │   └── firestoreSchema.ts   ← Firestore collection definitions
│   ├── routes/
│   │   ├── staffRoutes.ts
│   │   ├── slotRoutes.ts
│   │   ├── crmRoutes.ts
│   │   ├── revenueRoutes.ts
│   │   ├── galleryRoutes.ts
│   │   └── paymentRoutes.ts
│   ├── services/
│   │   ├── whatsappService.ts   ← Twilio WhatsApp
│   │   ├── reminderService.ts   ← Cron-based reminders
│   │   └── slotEngine.ts        ← Smart slot generation
│   └── index.ts                 ← MODIFIED — add new routes
```

### NEW Frontend Files
```
frontend/src/
├── components/
│   ├── booking/
│   │   ├── StaffPicker.tsx
│   │   ├── SlotPicker.tsx
│   │   └── PaymentModal.tsx
│   ├── admin/
│   │   ├── RevenueDashboard.tsx
│   │   ├── StaffManager.tsx
│   │   ├── CRMTable.tsx
│   │   └── GalleryManager.tsx
│   └── shared/
│       └── AdminLayout.tsx
├── pages/
│   ├── AdminDashboard.tsx
│   └── BookingPage.tsx          ← MODIFIED — add staff + slot + payment
├── services/
│   ├── api.ts                   ← Central Axios instance
│   ├── staffService.ts
│   ├── slotService.ts
│   └── paymentService.ts
└── types/
    └── index.ts                 ← All shared TypeScript types
```

## Environment Variables Required
```env
# backend/.env
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
FIREBASE_SERVICE_ACCOUNT=./serviceAccountKey.json
PORT=4000

# frontend/.env
VITE_API_URL=http://localhost:4000
VITE_RAZORPAY_KEY_ID=rzp_live_xxx
```

## Install Dependencies
```bash
# Backend
npm install express cors dotenv firebase-admin twilio razorpay node-cron multer
npm install -D typescript @types/node @types/express @types/cors @types/multer ts-node nodemon

# Frontend
npm install axios razorpay framer-motion recharts react-hot-toast
```
