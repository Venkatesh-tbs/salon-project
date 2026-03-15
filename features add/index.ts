// ============================================================
// frontend/src/types/index.ts
// Shared TypeScript types for the entire salon system
// ============================================================

export type ServiceCategory =
  | "haircut"
  | "color"
  | "facial"
  | "nails"
  | "keratin"
  | "bridal"
  | "scalp"
  | "blowout";

// ─── Staff ───────────────────────────────────────────────────
export interface StaffMember {
  staffId: string;
  name: string;
  avatar?: string;
  role: string; // "Senior Stylist" | "Colorist" | etc.
  services: string[]; // service names this staff can perform
  availability: WeeklyAvailability;
  rating?: number;
  totalBookings?: number;
  isActive: boolean;
}

export interface WeeklyAvailability {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  isOpen: boolean;
  startTime: string; // "09:00"
  endTime: string;   // "19:00"
}

// ─── Time Slots ──────────────────────────────────────────────
export interface TimeSlot {
  time: string;        // "10:00"
  available: boolean;
  bookingId?: string;
}

export interface SlotQuery {
  staffId: string;
  date: string;        // "YYYY-MM-DD"
  serviceId: string;
}

// ─── Services ────────────────────────────────────────────────
export interface SalonService {
  serviceId: string;
  name: string;
  duration: number;    // minutes
  price: number;       // INR
  advanceAmount: number; // advance to pay online
  category: ServiceCategory;
  description?: string;
  icon: string;
}

// ─── Appointments ────────────────────────────────────────────
export interface Appointment {
  bookingId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  serviceDuration: number;
  staffId: string;
  staffName: string;
  date: string;        // "YYYY-MM-DD"
  startTime: string;   // "10:00"
  endTime: string;     // "10:30"
  status: "pending" | "confirmed" | "completed" | "cancelled";
  paymentStatus: "unpaid" | "advance_paid" | "fully_paid";
  paymentId?: string;
  razorpayOrderId?: string;
  advanceAmount: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
}

// ─── CRM / Clients ───────────────────────────────────────────
export interface Client {
  clientId: string;
  phoneNumber: string;
  name: string;
  email?: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;   // ISO date string
  firstVisit: string;
  preferredStaff?: string;
  preferredService?: string;
  isVIP: boolean;      // totalVisits >= 10 or totalSpent >= 5000
  tags?: string[];
}

// ─── Revenue / Analytics ─────────────────────────────────────
export interface RevenueStats {
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  peakHours: PeakHour[];
  revenueByDay: DailyRevenue[];
  bookingsByService: ServiceBookingCount[];
  topStaff: StaffRevenue[];
}

export interface PeakHour {
  hour: string;
  count: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  bookings: number;
}

export interface ServiceBookingCount {
  serviceName: string;
  count: number;
  revenue: number;
}

export interface StaffRevenue {
  staffId: string;
  staffName: string;
  bookings: number;
  revenue: number;
}

// ─── Gallery ─────────────────────────────────────────────────
export interface GalleryItem {
  itemId: string;
  category: "haircut" | "color" | "beforeafter" | "portfolio" | "salon";
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  staffId?: string;
  staffName?: string;
  uploadedAt: string;
  isPublished: boolean;
}

// ─── Payment ─────────────────────────────────────────────────
export interface RazorpayOrder {
  orderId: string;
  amount: number;
  currency: string;
  bookingId: string;
}

export interface PaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  bookingId: string;
}

// ─── Salon Config ─────────────────────────────────────────────
export interface SalonConfig {
  workingHours: {
    start: string; // "09:00"
    end: string;   // "20:00"
  };
  slotInterval: number; // minutes — 15 | 30
  advanceBookingDays: number; // how many days ahead
  currency: string;
}

export const SALON_CONFIG: SalonConfig = {
  workingHours: { start: "09:00", end: "20:00" },
  slotInterval: 30,
  advanceBookingDays: 30,
  currency: "INR",
};
