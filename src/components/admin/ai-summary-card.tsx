import { Sparkles } from "lucide-react";
import { Appointment } from "@/firebase/db";

export function AiSummaryCard({ appointments }: { appointments: Appointment[] }) {
  const getSummaryText = () => {
    if (appointments.length === 0) {
      return "No bookings today yet. Get started by adding one manually or awaiting client requests!";
    }
    if (appointments.length === 1) {
      return `Today, there is a total of 1 appointment booked. The only service scheduled is a ${appointments[0].service}. This indicates a very light day for bookings. You might want to run a quick promotion.`;
    }
    return `Today there are ${appointments.length} appointments booked. Make sure to prepare your tools for the different scheduled services. Looks like a solid day!`;
  };

  return (
    <div className="relative group rounded-2xl p-7 text-white flex-1 h-full overflow-hidden hover-lift shadow-[0_10px_40px_rgba(123,47,247,0.2)]">
      {/* Animated Deep Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2a0e45] via-brand-purple to-brand-pink bg-[length:200%_200%] animate-[gradient_8s_ease_infinite] opacity-90"></div>
      
      {/* Glass overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"></div>
      
      {/* Content */}
      <div className="relative z-10 h-full flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md border border-white/20 shadow-inner">
            <Sparkles className="h-5 w-5 text-brand-pink fill-brand-pink/20 animate-pulse" />
          </div>
          <h3 className="font-heading font-semibold tracking-wide text-lg text-white/90">Aura AI Insight</h3>
        </div>
        
        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-5 backdrop-blur-md shadow-inner">
          <p className="text-[15px] leading-relaxed text-white/80 font-medium">
            {getSummaryText()}
          </p>
        </div>
      </div>
      
      {/* Decorative Glows */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 blur-3xl rounded-full pointer-events-none"></div>
    </div>
  );
}
