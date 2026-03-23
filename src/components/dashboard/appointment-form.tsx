'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Loader2, 
  Sparkles, 
  User, 
  Phone, 
  Calendar as CalendarIcon, 
  Clock, 
  MessageSquare,
  Scissors,
  Palette,
  Sparkle,
  Droplets,
  Flame,
  Sword,
  Mail,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { ref, push, get } from 'firebase/database';
import { db } from '@/firebase';
import { Appointment, Service, subscribeToServices, initDefaultServices, checkBookingOverlap } from '@/firebase/db';
import { RazorpayModal } from '@/components/dashboard/RazorpayModal';
import { v4 as uuidv4 } from 'uuid';

/**
 * Formats any Indian phone number to E.164 international format.
 * Examples:
 *   9876543210      → +919876543210
 *   +919876543210   → +919876543210
 *   98765 43210     → +919876543210
 *   0919876543210   → +919876543210
 */
function formatPhoneNumber(phone: string): string {
  // Strip all spaces, dashes, parentheses
  const digits = phone.replace(/[\s\-().]/g, '');

  console.log('[Phone Format] Input:', phone);

  let formatted: string;

  if (digits.startsWith('+91') && digits.length === 13) {
    // Already correct: +919876543210
    formatted = digits;
  } else if (digits.startsWith('91') && digits.length === 12) {
    // 919876543210 → +919876543210
    formatted = '+' + digits;
  } else if (digits.startsWith('0') && digits.length === 11) {
    // 09876543210 → +919876543210
    formatted = '+91' + digits.slice(1);
  } else if (digits.length === 10) {
    // 9876543210 → +919876543210
    formatted = '+91' + digits;
  } else {
    // Unknown format — pass through as-is
    formatted = digits.startsWith('+') ? digits : '+' + digits;
  }

  console.log('[Phone Format] Output:', formatted);
  return formatted;
}

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phone: z.string().min(10, { message: "Please enter a valid phone number." }),
  email: z.string().email({ message: "Please enter a valid email address." }).optional().or(z.literal('')),
  service: z.string().min(1, { message: "Please select a service." }),
  staff: z.string().min(1, { message: "Please select a stylish." }).optional(),
  date: z.string().min(1, { message: "Please select a date." }).regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  time: z.string().min(1, { message: "Please select a time." }),
  notes: z.string().optional(),
});

interface AppointmentFormProps {
  initialData?: Appointment;
  onSuccess?: () => void;
}

const SERVICE_ICONS: Record<string, React.ElementType> = {
  scissors: Scissors,
  blade: Sword,
  palette: Palette,
  droplets: Droplets,
  sparkle: Sparkle,
  flame: Flame,
};

const SERVICE_EMOJIS: Record<string, string> = {
  "Haircut & Styling": "✂️",
  "Beard Trim & Shape": "🧔",
  "Hair Coloring": "🎨",
  "Facial Treatment": "💆",
  "Waxing": "🔥",
  "Head Massage": "🧠"
};

// Ripple button component
const RippleButton = React.forwardRef<HTMLButtonElement, {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  type?: "button" | "submit";
}>(({ onClick, disabled, loading, children, type = "button" }, ref) => {
  const btnRef = React.useRef<HTMLButtonElement>(null);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = btnRef.current;
    if (!btn) return;
    const { left, top } = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.style.cssText = `
      position:absolute;width:4px;height:4px;border-radius:50%;
      background:rgba(255,255,255,0.5);
      transform:scale(0);animation:ripple 0.6s linear;
      left:${e.clientX - left - 2}px;top:${e.clientY - top - 2}px;
      pointer-events:none;
    `;
    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
    if (onClick && !disabled && !loading) onClick();
  };

  return (
    <button
      ref={(node) => {
        btnRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      className="relative w-full min-h-[48px] py-4 rounded-xl font-bold text-white overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed z-10 text-base"
      style={{
        backgroundImage: loading
          ? "linear-gradient(135deg, #9333ea, #6d28d9)"
          : "linear-gradient(135deg, #c026d3, #7c3aed, #6366f1)",
        backgroundSize: "200% 200%",
        boxShadow: "0 0 40px #c026d322, 0 4px 20px #7c3aed33",
        letterSpacing: "0.05em",
      }}
    >
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.span
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-3"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {children}
          </motion.span>
        )}
      </AnimatePresence>
      <style jsx global>{`
        @keyframes ripple { to { transform: scale(80); opacity: 0; } }
        
        /* Fix browser autofill background */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        select:-webkit-autofill,
        select:-webkit-autofill:hover,
        select:-webkit-autofill:focus {
          -webkit-text-fill-color: white !important;
          -webkit-box-shadow: 0 0 0px 1000px #1a1625 inset !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        /* Ensure select options are readable */
        select option {
          background-color: #1a1625 !important;
          color: white !important;
        }

        /* ── Premium Dropdown UI ───────────────────────────── */
        .dropdown-menu {
          background: rgba(20, 10, 40, 0.95);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          box-shadow: 0 0 30px rgba(168,85,247,0.2);
          overflow-y: auto;
          max-height: 220px;
          animation: dropFadeIn 0.18s ease;
          transform-origin: top;
          position: absolute;
          width: 100%;
          top: 100%;
          left: 0;
          z-index: 9999;
          margin-top: 8px;
          padding: 8px;
          display: block;
          opacity: 1;
        }

        @media (max-width: 768px) {
          .dropdown-menu {
            position: fixed;
            bottom: 0;
            left: 0;
            top: auto;
            width: 100%;
            max-height: 60vh;
            border-radius: 16px 16px 0 0;
            background: rgba(20,10,40,0.95);
            backdrop-filter: blur(20px);
            z-index: 9999;
            overflow-y: auto;
            margin-top: 0;
            transform-origin: bottom;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            padding-bottom: env(safe-area-inset-bottom, 20px);
            border: 1px solid rgba(255,255,255,0.05);
            border-bottom: none;
            box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
          }
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        }

        .dropdown-menu::-webkit-scrollbar {
          width: 4px;
        }
        .dropdown-menu::-webkit-scrollbar-thumb {
          background: #a855f7;
          border-radius: 10px;
        }

        @keyframes dropFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(-5px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .dropdown-item {
          padding: 10px 14px;
          border-radius: 8px;
          transition: all 0.2s ease;
          cursor: pointer;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(255,255,255,0.8);
        }
        .dropdown-item:hover:not(.disabled) {
          background: rgba(168,85,247,0.2);
          transform: translateX(4px);
          color: white;
          box-shadow: 0 0 10px rgba(168,85,247,0.3);
        }
        .dropdown-item.selected {
          background: linear-gradient(90deg, #a855f7, #6366f1);
          color: white;
          font-weight: 600;
          box-shadow: 0 0 12px rgba(168,85,247,0.5);
        }
        .dropdown-item.disabled {
          opacity: 0.6;
          pointer-events: none;
        }
      `}</style>
    </button>
  );
});
RippleButton.displayName = "RippleButton";

// Floating Input Field Component
const FloatingInput = ({ field, icon: Icon, label, type = "text", placeholder = " ", ...props }: any) => {
  const [focused, setFocused] = React.useState(false);
  const value = field.value || "";
  const raised = focused || value.length > 0 || type === "date"; // Dates always show mm/dd/yyyy natively

  // Merge event handlers properly
  const handleBlur = (e: any) => {
    field.onBlur?.(e);
    setFocused(false);
  };
  
  const handleFocus = (e: any) => {
    setFocused(true);
  };

  return (
    <div className="relative group w-full">
      <label
        htmlFor={field.name}
        className="absolute z-10 pointer-events-none transition-all duration-200 font-medium"
        style={{
          left: "2.75rem",
          top: raised ? "-0.6rem" : "1.1rem",
          fontSize: raised ? "0.7rem" : "0.9rem",
          color: focused ? "#e879f9" : raised ? "#a855f7" : "rgba(255,255,255,0.35)",
          backgroundColor: raised ? "#07050f" : "transparent",
          padding: raised ? "0 0.25rem" : "0",
          lineHeight: 1,
          letterSpacing: "0.04em",
        }}
      >
        {label}
      </label>
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/40 group-focus-within:text-fuchsia-400 transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <input
        type={type}
        id={field.name}
        className="peer w-full h-14 rounded-xl bg-white/[0.07] border border-white/10 px-12 pt-4 pb-1 text-sm text-white outline-none transition-all focus:border-fuchsia-500 focus:ring-0 focus:bg-white/[0.1] shadow-inner"
        placeholder={focused ? placeholder : " "}
        {...field}
        {...props}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
};

export function AppointmentForm({ initialData, onSuccess }: AppointmentFormProps) {
  const { toast } = useToast();
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [aiRequest, setAiRequest] = React.useState('');
  const [services, setServices] = React.useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = React.useState(true);
  
  const [staffList, setStaffList] = React.useState<any[]>([]);
  const [staffLoading, setStaffLoading] = React.useState(false);
  const [slots, setSlots] = React.useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);

  const [success, setSuccess] = React.useState(false);
  const [lastBooking, setLastBooking] = React.useState<{
    name: string; phone: string; service: string; date: string; time: string;
  } | null>(null);
  // Payment state
  const [paymentModal, setPaymentModal] = React.useState(false);
  const [pendingValues, setPendingValues] = React.useState<z.infer<typeof formSchema> | null>(null);
  const [pendingBookingId] = React.useState(() => uuidv4());

  // Dropdown state
  const [openDropdown, setOpenDropdown] = React.useState<'service' | 'staff' | 'time' | null>(null);
  const [searchService, setSearchService] = React.useState("");
  const [searchStaff, setSearchStaff] = React.useState("");

  // Close dropdowns on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.premium-dropdown')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  // Load services from Firebase
  React.useEffect(() => {
    initDefaultServices(db).catch(console.error);
    const unsubscribe = subscribeToServices(db, (data) => {
      setServices(data);
      setServicesLoading(false);
    });
    return unsubscribe;
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      phone: initialData.phone,
      email: '', // Not in original appointment type but added for new UI
      service: initialData.service,
      staff: '',
      date: initialData.date,
      time: initialData.time,
      notes: initialData.notes || '',
    } : {
      name: '',
      phone: '',
      email: '',
      service: '',
      staff: '',
      date: todayStr,
      time: '',
      notes: '',
    },
  });

  const watchService = form.watch("service");
  const watchStaff = form.watch("staff");
  const watchDate = form.watch("date");

  // Load Staff based on Service + Date
  React.useEffect(() => {
    if (!watchService || !watchDate) return;
    setStaffLoading(true);
    form.setValue("staff", "");
    form.setValue("time", "");
    
    // find service ID from name because original app used name for value
    const svcObj = services.find(s => s.name === watchService);
    const svcId = svcObj?.id || watchService;

    fetch(`/api/staff/for-service/${svcId}?date=${watchDate}`)
      .then(r => r.json())
      .then(data => setStaffList(data || []))
      .catch(() => setStaffList([]))
      .finally(() => setStaffLoading(false));
  }, [watchService, watchDate, services, form]);

  // Load Slots based on Staff + Date
  React.useEffect(() => {
    if (!watchStaff || !watchDate || !watchService) return;
    setSlotsLoading(true);
    form.setValue("time", "");
    
    const svcObj = services.find(s => s.name === watchService);
    const svcId = svcObj?.id || watchService;

    fetch(`/api/slots?staffId=${watchStaff}&date=${watchDate}&serviceId=${svcId}`)
      .then(r => r.json())
      .then(data => setSlots(data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [watchStaff, watchDate, watchService, services, form]);

  const handleAiExtraction = async () => {
    if (!aiRequest.trim()) return;
    setIsAiLoading(true);
    try {
      console.log('[AI Autofill] Sending request:', aiRequest);

      const response = await fetch('/api/ai-autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiRequest }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const details = await response.json();
      console.log('[AI Autofill] Result:', details);

      if (details.error && !details.name && !details.service) {
        throw new Error(details.error);
      }

      let filled = 0;
      if (details.name) { form.setValue('name', details.name); filled++; }
      if (details.service) { form.setValue('service', details.service); filled++; }
      if (details.date) { form.setValue('date', details.date); filled++; }
      if (details.time) { form.setValue('time', details.time); filled++; }

      if (filled === 0) {
        toast({
          title: "Couldn't Detect Details",
          description: "Try adding a name, service, date and time.",
        });
      } else {
        toast({
          title: "✨ Form Auto-Filled!",
          description: `Detected ${filled} field${filled > 1 ? 's' : ''} from your request.`,
        });
        setAiRequest('');
      }
    } catch (error: any) {
      console.error('[AI Autofill Error]:', error);
      toast({
        variant: "destructive",
        title: "AI Unavailable",
        description: "AI assistant temporarily unavailable. Please fill the form manually.",
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const saveAppointmentToFirebase = async (
    values: z.infer<typeof formSchema>,
    paymentId?: string
  ) => {
    // ── PRIORITY 0: Salon-wide closure check ─────────────────────────────────
    if (values.date) {
      const salonSnap = await get(ref(db, `salonLeaves/${values.date}`));
      if (salonSnap.exists()) {
        toast({
          variant: 'destructive',
          title: '🏪 Salon Closed',
          description: `The salon is closed on ${values.date}. Please choose a different date.`,
        });
        return;
      }
    }

    // ── CRITICAL: Block past date/time bookings ───────────────────────────────
    if (values.date && values.time) {
      const [bH, bM] = values.time.split(':').map(Number);
      const [bY, bMo, bD] = values.date.split('-').map(Number);
      const bookingDateTime = new Date(bY, bMo - 1, bD, bH, bM, 0, 0);
      if (bookingDateTime < new Date()) {
        toast({
          variant: 'destructive',
          title: 'Cannot Book Past Time',
          description: 'The selected date and time have already passed. Please choose a future slot.',
        });
        return;
      }
    }

    const svcObj = services.find(s => s.name === values.service);
    const staffObj = staffList.find(s => s.staffId === values.staff);
    
    const duration = svcObj?.duration || 45;
    const staffId = values.staff || '';

    // 🔥 Real-time DB check for double bookings
    if (staffId && values.date && values.time) {
      const isConflict = await checkBookingOverlap(
        db,
        staffId,
        values.date,
        values.time,
        duration
      );
      if (isConflict) {
        toast({
          variant: 'destructive',
          title: 'Time Slot Taken',
          description: 'This time slot is no longer available. Please select another time.',
        });
        return; // Abort saving completely
      }
    }

    const appointment: Record<string, any> = {
      name: values.name,
      phone: values.phone,
      service: values.service,
      servicePrice: svcObj?.price || 0,
      serviceDuration: svcObj?.duration || 45,
      staffId: values.staff || '',
      staffName: staffObj?.name || 'Unassigned',
      staffEmail: staffObj?.email || '',
      date: values.date,
      time: values.time,
      notes: values.notes || '',
      email: values.email || '',
      status: 'pending' as const,
      paymentId: paymentId || null,
      paymentStatus: paymentId ? 'paid' : 'unpaid',
      reminderSent: false,
      createdAt: Date.now(),
    };
    try {
      await push(ref(db, 'appointments'), appointment);
      
      // Push BOOKING notification
      await push(ref(db, 'notifications'), {
        type: 'BOOKING',
        message: `New booking by ${appointment.name} for ${appointment.service}`,
        createdAt: Date.now(),
        read: false,
        staffId: appointment.staffId || null,
      }).catch(err => console.error('Failed to push notification:', err));

      console.log('[Booking] Booking saved successfully:', appointment.name, appointment.date, appointment.time);

      // Store booking details for WhatsApp fallback link
      setLastBooking({
        name: appointment.name,
        phone: appointment.phone,
        service: appointment.service,
        date: appointment.date,
        time: appointment.time,
      });

      // WhatsApp confirmation — fire and forget (non-blocking)
      const formattedPhone = formatPhoneNumber(appointment.phone);
      fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formattedPhone,
          name: appointment.name,
          date: appointment.date,
          time: appointment.time,
          service: appointment.service,
          staffName: appointment.staffName,
        }),
      })
        .then(r => r.json())
        .then(res => {
          if (res.success) console.log('[WhatsApp] WhatsApp confirmation sent ✅');
          else console.warn('[WhatsApp] Notification skipped:', res.error || res);
        })
        .catch(err => console.error('[WhatsApp] Fetch error:', err.message));

      setSuccess(true);
      form.reset({ name: '', phone: '', email: '', service: '', staff: '', date: todayStr, time: '', notes: '' });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Firebase error:', error);
      toast({
        variant: 'destructive',
        title: 'Booking Failed',
        description: 'Could not save your appointment. Please try again.',
      });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const svcObj = services.find(s => s.name === values.service);
    const price = svcObj?.price || 0;
    // Collect advance = 25% of service price (minimum ₹0)
    const advance = price > 0 ? Math.round(price * 0.25) : 0;

    if (advance > 0) {
      // Show payment modal; booking is saved after payment
      setPendingValues(values);
      setPaymentModal(true);
    } else {
      // Free booking — save directly
      await saveAppointmentToFirebase(values);
    }
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center py-8 flex flex-col items-center gap-3 md:gap-4 bg-white/[0.03] rounded-3xl border border-white/10 p-4 md:p-10"
          >
            <div className="text-6xl animate-bounce">✨</div>
            <h3 className="text-2xl font-bold text-white font-syne">
              You're Booked!
            </h3>
            <p className="text-white/50">We'll confirm your appointment via WhatsApp shortly.</p>
            {lastBooking && (() => {
              const SALON_WHATSAPP = "916383454256";
              const msg = encodeURIComponent(
                `Hello Salon Luxé 👋\n\nI’ve just booked an appointment on your website.\n\n👤 Name: ${lastBooking.name}\n💇 Service: ${lastBooking.service}\n📅 Date: ${lastBooking.date}\n⏰ Time: ${lastBooking.time}\n\nLooking forward to the appointment! 🙌\nPlease confirm my booking.\n\nThank you! ✂`
              );
              return (
                <a
                  href={`https://wa.me/${SALON_WHATSAPP}?text=${msg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 mt-2 px-8 py-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-semibold hover:bg-green-500/30 transition-all"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Confirm on WhatsApp
                </a>
              );
            })()}
            <button
              onClick={() => setSuccess(false)}
              className="mt-2 px-8 py-3 rounded-xl border border-fuchsia-500/40 text-fuchsia-300 text-sm hover:bg-fuchsia-500/10 transition-all font-semibold"
            >
              Book Another Session
            </button>
          </motion.div>
        ) : (
          <motion.div key="form" className="space-y-8">
            {!initialData && (
              <div className="relative p-6 rounded-2xl bg-white/[0.03] border border-fuchsia-500/20 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/5 to-indigo-500/5 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex flex-col space-y-4">
                  <div className="flex items-center gap-2 text-fuchsia-400 font-bold text-xs uppercase tracking-widest">
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>AI Intelligent Booking Assistant</span>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3">
                    <input
                      placeholder="e.g., 'Jane - hair cut tomorrow at 4pm'"
                      value={aiRequest}
                      onChange={(e) => setAiRequest(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiExtraction()}
                      className="flex-1 h-12 rounded-xl bg-black/40 border border-white/10 px-5 text-sm md:text-base text-white focus:outline-none focus:border-fuchsia-500 transition-all placeholder:text-white/20 w-full"
                    />
                    <button
                      type="button"
                      onClick={handleAiExtraction}
                      disabled={isAiLoading || !aiRequest.trim()}
                      className="min-h-[48px] px-6 rounded-xl text-sm md:text-base font-bold bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 whitespace-nowrap"
                    >
                      {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Auto-Fill"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FloatingInput field={field} icon={User} label="Full Name" placeholder="Jane Doe" />
                        </FormControl>
                        <FormMessage className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider pl-2" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FloatingInput field={field} icon={Phone} label="Phone Number" placeholder="+91 98765 43210" />
                        </FormControl>
                        <FormMessage className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider pl-2" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FloatingInput field={field} icon={Mail} label="Email Address" placeholder="jane@example.com" />
                      </FormControl>
                      <FormMessage className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider pl-2" />
                    </FormItem>
                  )}
                />

                {/* Service Selector */}
                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <div className={`relative group w-full premium-dropdown ${openDropdown === 'service' ? 'z-50' : 'z-10'}`}>
                        <label
                          className="absolute z-10 pointer-events-none transition-all duration-200 font-medium"
                          style={{
                            left: "2.75rem",
                            top: field.value ? "-0.6rem" : "1.1rem",
                            fontSize: field.value ? "0.7rem" : "0.9rem",
                            color: field.value ? "#a855f7" : "rgba(255,255,255,0.35)",
                            background: field.value ? "#07050f" : "transparent",
                            padding: field.value ? "0 0.25rem" : "0",
                            lineHeight: 1,
                            letterSpacing: "0.04em",
                          }}
                        >
                          Select Service
                        </label>
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/40 group-focus-within:text-fuchsia-400 z-10">
                          <Sparkle className="h-5 w-5" />
                        </div>
                        
                        {/* Custom Dropdown Trigger */}
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(openDropdown === 'service' ? null : 'service')}
                          className="w-full h-14 rounded-xl bg-white/[0.07] border border-white/10 pl-12 pr-10 text-left text-sm text-white outline-none transition-all focus:border-fuchsia-500 cursor-pointer flex items-center"
                        >
                          {field.value ? field.value : servicesLoading ? (
                            <span className="text-white/40 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading services...</span>
                          ) : <span className="text-white/40"></span>}
                        </button>
                        
                        {/* Custom Dropdown Menu */}
                        {openDropdown === 'service' && (
                          <div className="dropdown-menu">
                            <input
                              type="text"
                              placeholder="Search service..."
                              value={searchService}
                              onChange={(e) => setSearchService(e.target.value)}
                              className="w-full px-3 py-2 mb-2 bg-black/30 border border-white/5 rounded-lg text-sm outline-none text-white placeholder:text-white/40 focus:border-fuchsia-500/50 transition-colors"
                              autoFocus
                            />
                            {Array.from(new Map(services.map(s => [s.name, s])).values())
                              .filter(svc => svc.name.toLowerCase().includes(searchService.toLowerCase()))
                              .map((svc) => (
                              <div
                                key={svc.id}
                                className={`dropdown-item ${field.value === svc.name ? 'selected' : ''}`}
                                onClick={() => {
                                  field.onChange(svc.name);
                                  setOpenDropdown(null);
                                  setSearchService('');
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{SERVICE_EMOJIS[svc.name] || "✨"}</span>
                                  <div className="flex flex-col">
                                    <span className="text-sm">{svc.name}</span>
                                    <span className="text-[10px] opacity-70">{svc.duration} mins</span>
                                  </div>
                                </div>
                                <span className="text-sm font-semibold">₹{svc.price}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                          ▼
                        </div>
                      </div>
                      <FormMessage className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider pl-2" />
                    </FormItem>
                  )}
                />

                {/* Staff Selector */}
                <FormField
                  control={form.control}
                  name="staff"
                  render={({ field }) => (
                    <FormItem>
                      <div className={`relative group w-full premium-dropdown ${openDropdown === 'staff' ? 'z-50' : 'z-10'}`}>
                        <label
                          className="absolute z-10 pointer-events-none transition-all duration-200 font-medium"
                          style={{
                            left: "2.75rem",
                            top: "-0.6rem",
                            fontSize: "0.7rem",
                            color: field.value ? "#a855f7" : "rgba(255,255,255,0.35)",
                            background: "#07050f",
                            padding: "0 0.25rem",
                            lineHeight: 1,
                            letterSpacing: "0.04em",
                          }}
                        >
                          Select Stylist
                        </label>
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/40 group-focus-within:text-fuchsia-400 z-10">
                          <User className="h-5 w-5" />
                        </div>
                        
                        <button
                          type="button"
                          disabled={!watchService || staffLoading}
                          onClick={() => setOpenDropdown(openDropdown === 'staff' ? null : 'staff')}
                          className={`w-full h-14 rounded-xl bg-white/[0.07] border border-white/10 pl-12 pr-10 text-left text-sm outline-none transition-all focus:border-fuchsia-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${!field.value ? 'text-white/40' : 'text-white'}`}
                        >
                          {field.value 
                            ? staffList.find(s => s.staffId === field.value)?.name || field.value
                            : !watchService 
                              ? "Select a service first" 
                              : staffLoading 
                                ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Loading stylists...</span> 
                                : "Choose your stylist"
                          }
                        </button>

                        {openDropdown === 'staff' && staffList.length > 0 && (
                          <div className="dropdown-menu">
                            <input
                              type="text"
                              placeholder="Search stylist..."
                              value={searchStaff}
                              onChange={(e) => setSearchStaff(e.target.value)}
                              className="w-full px-3 py-2 mb-2 bg-black/30 border border-white/5 rounded-lg text-sm outline-none text-white placeholder:text-white/40 focus:border-fuchsia-500/50 transition-colors"
                              autoFocus
                            />
                            {staffList
                              .filter((st: any) => st.name.toLowerCase().includes(searchStaff.toLowerCase()))
                              .map((st: any) => (
                              <div
                                key={st.staffId}
                                className={`dropdown-item ${field.value === st.staffId ? 'selected' : ''} ${st.isOnLeave ? 'disabled' : ''}`}
                                onClick={() => {
                                  if (st.isOnLeave) return;
                                  field.onChange(st.staffId);
                                  setOpenDropdown(null);
                                  setSearchStaff('');
                                }}
                              >
                                <div className="flex items-center">
                                  <div className="flex flex-col">
                                    <span className="text-sm truncate">{st.name}</span>
                                    <span className="text-[10px] opacity-70">{st.role}</span>
                                  </div>
                                  {st.isOnLeave && (
                                    <span className="text-red-400 text-[10px] ml-2 font-bold whitespace-nowrap">
                                      ● On Leave
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                          ▼
                        </div>
                      </div>
                      <FormMessage className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider pl-2" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <FloatingInput field={field} icon={CalendarIcon} label="Appointment Date" type="date" min={todayStr} />
                        </FormControl>
                        <FormMessage className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider pl-2" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="time"
                    render={({ field }) => (
                      <FormItem>
                        <div className={`relative group w-full premium-dropdown ${openDropdown === 'time' ? 'z-50' : 'z-10'}`}>
                          <label
                            className="absolute z-10 pointer-events-none transition-all duration-200 font-medium"
                            style={{
                              left: "2.75rem",
                              top: "-0.6rem",
                              fontSize: "0.7rem",
                              color: field.value ? "#a855f7" : "rgba(255,255,255,0.35)",
                              background: "#07050f",
                              padding: "0 0.25rem",
                              lineHeight: 1,
                              letterSpacing: "0.04em",
                            }}
                          >
                            Preferred Time
                          </label>
                          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/40 group-focus-within:text-fuchsia-400 z-10">
                            <Clock className="h-5 w-5" />
                          </div>
                          
                          <button
                            type="button"
                            disabled={!watchStaff || !watchDate || slotsLoading}
                            onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
                            className={`w-full h-14 rounded-xl bg-white/[0.07] border border-white/10 pl-12 pr-10 text-left text-sm outline-none transition-all focus:border-fuchsia-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${!field.value ? 'text-white/40' : 'text-white'}`}
                          >
                            {field.value 
                              ? field.value
                              : !watchStaff 
                                ? "Select a stylist" 
                                : slotsLoading 
                                  ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Finding slots...</span> 
                                  : slots.length === 0 
                                    ? "No slots available" 
                                    : "Choose a time slot"
                            }
                          </button>

                          {openDropdown === 'time' && slots.length > 0 && (
                            <div className="dropdown-menu">
                              {(() => {
                                const grouped = slots.filter((s:any) => s.available).reduce((acc: any, slot: any) => {
                                  const [h] = slot.time.split(':').map(Number);
                                  let period = 'Evening 🌙';
                                  if (h < 12) period = 'Morning ☀️';
                                  else if (h < 17) period = 'Afternoon 🌤️';
                                  
                                  if (!acc[period]) acc[period] = [];
                                  acc[period].push(slot);
                                  return acc;
                                }, {});

                                return Object.entries(grouped).map(([period, slotArr]: [string, any]) => (
                                  <div key={period} className="mb-2">
                                    <div className="text-[10px] text-white/40 px-2 mt-2 mb-1.5 font-bold uppercase tracking-widest sticky top-0 bg-[rgba(20,10,40,0.95)] backdrop-blur-md z-10">
                                      {period}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 px-2">
                                      {slotArr.map((slot: any) => (
                                        <div
                                          key={slot.time}
                                          className={`dropdown-item !justify-center !text-sm ${field.value === slot.time ? 'selected' : ''}`}
                                          style={{ padding: '8px', marginBottom: 0 }}
                                          onClick={() => {
                                            field.onChange(slot.time);
                                            setOpenDropdown(null);
                                          }}
                                        >
                                          {slot.time}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ));
                                
                              })()}
                            </div>
                          )}

                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                            ▼
                          </div>
                        </div>
                        <FormMessage className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider pl-2" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative group w-full">
                          <div className="absolute top-4 left-0 flex items-center pl-4 pointer-events-none text-white/40 group-focus-within:text-fuchsia-400 transition-colors">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                          <textarea
                            id={field.name}
                            className="peer w-full min-h-[100px] resize-none rounded-xl bg-white/[0.07] border border-white/10 px-12 py-4 text-sm text-white outline-none transition-all focus:border-fuchsia-500 shadow-inner placeholder:text-white/20"
                            placeholder="Any special requests or style preferences..."
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-wider pl-2" />
                    </FormItem>
                  )}
                />

                <RippleButton 
                  type="submit" 
                  loading={form.formState.isSubmitting}
                >
                  {(() => {
                    if (initialData) return 'Update Details';
                    const svcObj = services.find(s => s.name === form.watch('service'));
                    const price = svcObj?.price || 0;
                    const advance = price > 0 ? Math.round(price * 0.25) : 0;
                    return advance > 0 ? `Pay ₹${advance} & Confirm ✦` : 'Confirm Masterpiece ✦';
                  })()
                  }
                </RippleButton>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Razorpay Payment Modal */}
      {paymentModal && pendingValues && (() => {
        const svcObj = services.find(s => s.name === pendingValues.service);
        const price = svcObj?.price || 0;
        const advance = price > 0 ? Math.round(price * 0.25) : 0;
        return (
          <RazorpayModal
            isOpen={paymentModal}
            amount={advance}
            bookingId={pendingBookingId}
            customerName={pendingValues.name}
            serviceName={pendingValues.service}
            onSuccess={async (paymentId) => {
              setPaymentModal(false);
              await saveAppointmentToFirebase(pendingValues, paymentId);
              setPendingValues(null);
            }}
            onClose={() => {
              setPaymentModal(false);
            }}
          />
        );
      })()}
    </div>
  );
}
