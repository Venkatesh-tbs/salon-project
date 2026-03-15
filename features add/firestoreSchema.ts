// ============================================================
// backend/src/models/firestoreSchema.ts
// Firestore collection names + typed interfaces for backend
// ============================================================

// ─── Collection Names ─────────────────────────────────────────
export const COLLECTIONS = {
  APPOINTMENTS: "appointments",
  STAFF: "staff",
  CLIENTS: "clients",
  SERVICES: "services",
  GALLERY: "gallery",
  PAYMENTS: "payments",
  SALON_CONFIG: "salonConfig",
  REMINDERS: "reminders",
} as const;

// ─── Default Salon Services ───────────────────────────────────
export const DEFAULT_SERVICES = [
  { serviceId: "svc_001", name: "Precision Cut",    duration: 45,  price: 599,  advanceAmount: 100, category: "haircut", icon: "✂️" },
  { serviceId: "svc_002", name: "Color & Balayage", duration: 120, price: 2499, advanceAmount: 500, category: "color",   icon: "🎨" },
  { serviceId: "svc_003", name: "Luxury Facial",    duration: 60,  price: 1299, advanceAmount: 200, category: "facial",  icon: "💆" },
  { serviceId: "svc_004", name: "Nail Art Studio",  duration: 50,  price: 799,  advanceAmount: 100, category: "nails",   icon: "💅" },
  { serviceId: "svc_005", name: "Keratin Therapy",  duration: 180, price: 3499, advanceAmount: 700, category: "keratin", icon: "🌿" },
  { serviceId: "svc_006", name: "Bridal Package",   duration: 480, price: 9999, advanceAmount: 2000,category: "bridal",  icon: "👑" },
  { serviceId: "svc_007", name: "Scalp Ritual",     duration: 40,  price: 899,  advanceAmount: 0,   category: "scalp",   icon: "🧖" },
  { serviceId: "svc_008", name: "Blowout & Style",  duration: 30,  price: 499,  advanceAmount: 0,   category: "blowout", icon: "🔥" },
];

// ─── Default Staff ────────────────────────────────────────────
export const DEFAULT_STAFF = [
  {
    staffId: "staff_001",
    name: "Rahul",
    role: "Senior Stylist",
    services: ["svc_001", "svc_008"],
    isActive: true,
    availability: buildFullWeek("09:00", "19:00"),
  },
  {
    staffId: "staff_002",
    name: "Karthik",
    role: "Colorist",
    services: ["svc_001", "svc_002", "svc_005"],
    isActive: true,
    availability: buildFullWeek("10:00", "20:00"),
  },
  {
    staffId: "staff_003",
    name: "Ajay",
    role: "Beauty Specialist",
    services: ["svc_003", "svc_004", "svc_007"],
    isActive: true,
    availability: buildFullWeek("09:00", "18:00"),
  },
];

function buildFullWeek(start: string, end: string) {
  const days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
  return Object.fromEntries(
    days.map((d) => [d, { isOpen: d !== "sunday", startTime: start, endTime: end }])
  );
}
